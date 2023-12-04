const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const xlsx = require('xlsx');
require('dotenv').config();

const apiKey = process.env.API_KEY;

const bot = new TelegramBot('6655032768:AAEF2EahhCPWG5akWkujroAz2j5j57vipqk', {
  polling: true,
});

const http = require('http');
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // Handling the endpoint
  if (req.url === '/api/endpoint' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const responseData = { message: 'Hello, this is your API endpoint!' };
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

const userData = {};

const fieldData = {
  engineering: 'Engineering',
  applied_science: 'Applied Science',
};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  console.info(msg.chat.username, 'is registering!');
  const welcomeMessage =
    '😊 Baga Nagaan gara mooraa ASTU dhufte, Maqaan kee guutuun eenyu?';

  bot.sendMessage(chatId, welcomeMessage);
});

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
      `Galatoomi, ${msg.text}! Lakkoofsi bilbilaa kee meeqa`
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

// Listen for callback queries (button clicks)
bot.on('callback_query', (callbackQuery) => {
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;

  // Store the selected option in user data
  userData[userId].field = fieldData[data];

  // Display thank you message and collected data immediately after the user selects one of the options
  const collectedDataMessage = `Yeroo keetiif baay'ee Galatoomi, ${userData[userId].name}! Yeroo dhiyootti si quunnamna.
   Maqaa Guutuu: ${userData[userId].name}
    Lakkoofsa bilbilaa: ${userData[userId].phone}
    Magaalaa: ${userData[userId].city}
    Waldaa: ${userData[userId].church}
    Lakkoofsa Doormii: ${userData[userId].dormNumber}
    Gosa Tajaajilaa: ${userData[userId].gift}
    Gosa Barnootaa: ${userData[userId].field}`;

  // Write the collected data to studentsList.json
  const studentsListPath = './exportedData/studentsList.json';
  const studentsList = JSON.parse(
    fs.readFileSync(studentsListPath, 'utf-8') || '[]'
  );
  studentsList.push(userData[userId]);
  fs.writeFileSync(
    studentsListPath,
    JSON.stringify(studentsList, null, 2),
    'utf-8'
  );

  bot.sendMessage(userId, collectedDataMessage).then(() => {
    bot.sendMessage(
      userId,
      `Oddeeffannoo Argachuu Yoo Barbaadde Lakkoofsa Bilbila Armaan Gadii Fayyadami.
    0934217338
    0973704069
    0924995272`
    );
  });

  // Remove user data after completing the registration
  delete userData[userId];
});

bot.onText(/\/getList/, (msg) => {
  const userId = msg.chat.id;
  if (msg.text.split(' ')[1] !== 'admin@getList') {
    bot.sendMessage(
      userId,
      '⚠️⚠️⚠️Incorrect download keys, contact admin⚠️⚠️⚠️'
    );
    return;
  }
  try {
    const jsonData = JSON.parse(
      fs.readFileSync('./exportedData/studentsList.json')
    );

    const ws = xlsx.utils.json_to_sheet(jsonData);
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
      userId,
      filePath,
      {
        caption: 'Here is the list of students in Excel format.',
      },
      {
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    );

    fs.unlinkSync('./exportedData/studentsList.json');
    // bot.sendMessage(userId, 'Recieved');
  } catch (error) {
    console.log(error.message);
  }
});

bot.onText(/\/clearData/, (msg) => {
  // Write the collected data to studentsList.json
  const studentsListPath = './exportedData/studentsList.json';
  fs.writeFileSync(studentsListPath, JSON.stringify([], null, 2), 'utf-8');
  const chatId = msg.chat.id;
  fs.unlinkSync('./exportedData/studentsList.json');
  bot.sendMessage(chatId, 'Data list cleared successfully');
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});
