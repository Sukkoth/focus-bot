const TelegramBot = require('node-telegram-bot-api');
const connectToDatabase = require('./config/connectDb');
const fs = require('fs');
const xlsx = require('xlsx');
require('dotenv').config();

connectToDatabase();

const apiKey = process.env.API_KEY;

const bot = new TelegramBot(apiKey, {
  polling: true,
});

const http = require('http');
const Student = require('./models/Student');
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // Handling the endpoint
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const responseData = {
      message: "Hello, this is FOCUS ASTU student's registration bot",
    };
    res.end(JSON.stringify(responseData));
  } else {
    // Handling other routes
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

//stores temporarily students data before adding to json list
const userData = {};

const fieldData = {
  engineering: 'Engineering',
  applied_science: 'Applied Science',
};

/**
 * @desc starts the bot
 */
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  console.info(msg.chat.username, 'is registering!');
  const welcomeMessage =
    '😊 Baga Nagaan gara mooraa ASTU dhufte, Maqaan kee guutuun eenyu? 🤔';

  bot.sendMessage(chatId, welcomeMessage);
});

/**
 * @desc main function to register students by asking them questions
 */
bot.onText(/.*/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Check if the message is the /start or /getList command
  if (msg.text.startsWith('/')) {
    return;
  }

  // Check if user is already in the registration process
  if (!userData[userId]) {
    // If not, store the full name and ask for the phone number
    userData[userId] = { name: msg.text };
    bot.sendMessage(
      chatId,
      `Galatoomi, 🙏 ${msg.text}! Lakkoofsi bilbilaa kee meeqa? 📞📞`
    );
  } else if (!userData[userId].phone) {
    // If full name is already provided, store the phone number and ask for the city
    userData[userId].phone = msg.text;
    bot.sendMessage(
      chatId,
      `Baay'ee gaarii!🙂 Magaalaa(Naannoo) Kam irraa dhufte? 🏙️🏙️🏙️`
    );
  } else if (!userData[userId].city) {
    // If phone number is already provided, store the city and ask for the church
    userData[userId].city = msg.text;
    bot.sendMessage(
      chatId,
      `Waldaan ati keessatti hirmaacha turte maal jedhama? ⛪⛪⛪`
    );
  } else if (!userData[userId].church) {
    // If city is already provided, store the church and ask for the dorm number
    userData[userId].church = msg.text;
    bot.sendMessage(
      chatId,
      `Baay'ee Gaarii! Lakkoofsi Bilookii fi doormii kee meeqa? \nE.g. block/dorm 645/15`
    );
  } else if (!userData[userId].dormNumber) {
    // If church is already provided, store the dorm number and ask for spiritual gifts
    userData[userId].dormNumber = msg.text;
    bot.sendMessage(chatId, `Waldaa Keessa turtetti maaliin tajaajilaa turte?`);
  } else if (!userData[userId].gift) {
    // If spiritual gifts are already provided, store the selected option and present options with buttons
    userData[userId].gift = msg.text;

    // Present options with buttons immediately
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Engineering', callback_data: 'engineering' }],
          [{ text: 'Applied Science', callback_data: 'applied_science' }],
        ],
      },
    };

    bot.sendMessage(chatId, 'Muummeen barumsa keetii maalidha?', options);
  }
});

/**
 * @desc Listen for callback queries (button clicks)
 * since it is the final options, after this is selected
 * register the user
 */
//
bot.on('callback_query', (callbackQuery) => {
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;

  userData[userId].field = fieldData[data];
  userData[userId].date = new Date().toDateString();

  // Display thank you message and collected data immediately after the user selects one of the options
  const collectedDataMessage = `Yeroo keetiif baay'ee Galatoomi, 🙏🙏🙏 ${userData[userId].name}! Yeroo dhiyootti si quunnamna.
  Maqaa Guutuu: ${userData[userId].name}
  Lakkoofsa bilbilaa: ${userData[userId].phone}
  Magaalaa: ${userData[userId].city}
  Waldaa: ${userData[userId].church}
  Lakkoofsa Doormii: ${userData[userId].dormNumber}
  Gosa Tajaajilaa: ${userData[userId].gift}
  Gosa Barnootaa: ${userData[userId].field}`;

  createStudent(userData[userId])
    .then(() => {
      bot.sendMessage(userId, collectedDataMessage).then(() => {
        bot.sendMessage(
          userId,
          ` ℹ️💁 Odeeffannoo barbaachisaa argachuu yoo barbaadde \nkaraa lakkoofsa bilbila 📞 armaan gadii \nnu qunnamuu dandeessa! 🙂
      0934217338
      0973704069
      0924995272`
        );
      });

      //notify admins
      notifyAdminsOnUserRegistered(userData[userId])
        .then(() => console.log('NOTIFICATION SENT 🔔🔔'))
        .catch((error) => {
          console.log(
            `⚠️ Error on notification ${
              error?.message || 'Could not send notifications to admins 🥴'
            } `
          );
          bot.sendMessage(
            5230220534,
            'Could not send notifications to admins 🥴'
          );
        });

      // Remove user data after completing the registration
      delete userData[userId];
    })
    .catch((error) => {
      console.log('REGISTER ERROR', error);
      bot.sendMessage(userId, 'Could notregister student 🥴');
    });
});

/**
 * @desc get students list in excel format
 */
bot.onText(/\/getList/, (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  if (msg.text.split(' ')[1] !== 'admin@getList') {
    bot.sendMessage(
      chatId,
      '⚠️⚠️⚠️Incorrect download keys, contact admin⚠️⚠️⚠️'
    );
    return;
  }

  getStudents()
    .then((data) => {
      const ws = xlsx.utils.json_to_sheet(data);
      ws['!cols'] = [
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 25 },
        { wch: 15 },
        { wch: 30 },
        { wch: 15 },
      ];
      // Create a workbook and add the worksheet
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Sheet 1');

      // Write the Excel workbook to a file
      const filePath = `./exportedData/Students List.xlsx`;
      xlsx.writeFile(wb, filePath);
      bot.sendDocument(
        chatId,
        filePath,
        {
          caption: 'Here is the list of students in Excel format.',
        },
        {
          contentType: 'application/octet-stream',
        }
      );
    })
    .catch((error) => {
      bot.sendMessage(chatId, 'Could not fetch Students');
    });
});

/**
 * @desc clears studetnList data after carrying out test registrations
 */
bot.onText(/\/clearData/, (msg) => {
  // Write the collected data to studentsList.json
  const studentsListPath = './exportedData/studentsList.json';
  fs.writeFileSync(studentsListPath, JSON.stringify([], null, 2), 'utf-8');
  const chatId = msg.chat.id;
  // fs.unlinkSync('./exportedData/studentsList.json');
  bot.sendMessage(chatId, 'Data list cleared successfully');
});

/**
 * @desc handle polling error
 */
bot.on('polling_error', (error) => {
  console.error('🔔🔔 Polling error:', error);
});

/**
 * @desc Add an admin whom should recieve notifcation whenever a new studetns is registered
 */
bot.onText(/\/addNotification/, (msg) => {
  if (msg.from.id === 396798974 || msg.from.id === 5230220534) {
    try {
      const newUserId = Number(msg.text.split(' ')[1]);
      if (!newUserId) {
        bot.sendMessage(msg.chat.id, '🚩🥴 Please send user id');
        return;
      }

      //write to json file
      const notificationListPath = './data/notificationList.json';
      const notificationList = JSON.parse(
        fs.readFileSync(notificationListPath, 'utf-8') || '[]'
      );
      if (!notificationList.includes(newUserId)) {
        notificationList.push(newUserId);
        fs.writeFileSync(
          notificationListPath,
          JSON.stringify(notificationList, null, 2),
          'utf-8'
        );

        bot.sendMessage(
          msg.chat.id,
          `You have added ${newUserId} to recieve notification 🔔🔔`
        );
      } else {
        throw new Error('🥴User is already added');
      }
    } catch (error) {
      bot.sendMessage(
        msg.chat.id,
        `⚠️Error! \n\n${
          error?.message || 'Could not add new notification reciever'
        }`
      );
    }
  } else {
    bot.sendMessage(msg.chat.id, '⚠️⚠️⚠️ Unauthorized action');
  }

  // bot.sendMessage(5230220534, 'Hello there');
});

/**
 * @desc removes Notification subscriber,
 * @protected
 * @params {number}  telegramUserId
 */
bot.onText(/\/removeNotification/, (msg) => {
  if (msg.from.id === 396798974 || msg.from.id === 5230220534) {
    try {
      const userToBeRemoved = Number(msg.text.split(' ')[1]);
      if (!userToBeRemoved) {
        bot.sendMessage(msg.chat.id, '🚩🥴 Please send user id');
        return;
      }

      //write to json file
      const notificationListPath = './data/notificationList.json';
      let notificationList = JSON.parse(
        fs.readFileSync(notificationListPath, 'utf-8') || '[]'
      );

      notificationList = notificationList.filter(
        (userId) => userId !== userToBeRemoved
      );

      fs.writeFileSync(
        notificationListPath,
        JSON.stringify(notificationList, null, 2),
        'utf-8'
      );

      bot.sendMessage(
        msg.chat.id,
        `You have removed ${userToBeRemoved} from notification list 🔕🔕`
      );
    } catch (error) {
      bot.sendMessage(
        msg.chat.id,
        `⚠️Error! \n${error?.message || 'Could not remove the user'}`
      );
    }
  } else {
    bot.sendMessage(msg.chat.id, '⚠️⚠️⚠️ Unauthorized action');
  }
});

/**
 * @desc Clears Notification list,
 * @protected
 */
bot.onText(/\/notificationList/, (msg) => {
  if (msg.from.id === 396798974 || msg.from.id === 5230220534) {
    try {
      const notificationListPath = './data/notificationList.json';
      const notificationList = JSON.parse(
        fs.readFileSync(notificationListPath, 'utf-8') || '[]'
      );
      bot.sendMessage(
        msg.chat.id,
        `Notification List: 🔔🔔\n${notificationList.join(', \n')}`
      );
    } catch (error) {
      bot.sendMessage(
        msg.chat.id,
        `⚠️Error! \n${error?.message || 'Could not get notification list'}`
      );
    }
  } else {
    bot.sendMessage(msg.chat.id, '⚠️⚠️⚠️ Unauthorized action');
  }
});

bot.onText(/\/clearNotification/, (msg) => {
  fs.writeFileSync(
    './data/notificationList.json',
    JSON.stringify([], null, 2),
    'utf-8'
  );
  bot.sendMessage(msg.chat.id, 'Notification list cleared successfully');
});

/**
 *
 * @param {Object} studentInfo
 * @desc Notify admins whenever a new user is registered
 */
function notifyAdminsOnUserRegistered(studentInfo) {
  return new Promise((resolve, reject) => {
    try {
      const notificationListPath = './data/notificationList.json';
      const notificationList = JSON.parse(
        fs.readFileSync(notificationListPath, 'utf-8') || '[]'
      );

      notificationList.forEach((adminId) => {
        try {
          bot.sendMessage(
            adminId,
            `🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔\nA new user ${studentInfo?.name} has been registered!`
          );
        } catch (error) {
          console.log(
            `ERROR FOR SPECIFIC NOTIFICATION! ${adminId}`,
            error.message
          );
        }
      });
      resolve(); // Resolve the promise when all messages are sent
    } catch (error) {
      reject(error); // Reject the promise if there is an error
    }
  });
}

async function createStudent(studentInfo) {
  const student = await Student.create(studentInfo);

  if (student) {
    return student;
  } else {
    throw new Error('Could not create student');
  }
}

async function getStudents() {
  try {
    const students = await Student.find({})
      .select('-_id name phone city church dormNumber gift field date')
      .lean();

    return students;
  } catch (error) {
    throw new Error(error?.message);
  }
}
