const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const app = express();
const { google } = require('googleapis');
const fs = require('fs');
const port = 3000;

// Google Sheets API setup
const credentials = require('./credentials1.json'); // Your Google Sheets API credentials
const sheetId = '1y_khFlIsC8YKukOCaa7Jwg37S47r1b-mgBq2vQ9q19E'; // Replace with your Google Sheets document ID
const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });

// Set up multer for handling file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // console.log("Uploaded Yayyyyy", file);
        cb(null, 'uploads/'); // Make sure the 'uploads' folder exists
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = 'Data';
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Set the filename
    }
});

const upload = multer({ storage: storage });

// this is the Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// Serve the upload form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'upload.html'));
});

// Handle file upload
app.post('/upload', upload.single('csvFile'), async (req, res) => {
        try {
        // Process the uploaded CSV file (req.file.path)
        const csvFilePath = req.file.path;
        const csvData = fs.readFileSync(csvFilePath, 'utf-8');
        const rows = csvData.split('\n');
        const values = rows
            .filter(row => row.trim() !== '') // Skip empty rows
            .map(row => row.split(','));

        const resp = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Sheet1'
        })
        let response = {};
        console.log(resp?.data?.values?.[0], "|||||||||| resp |||||||", values[0], resp?.data?.values?.[0].toString() == values[0].toString() )
        if(resp?.data?.values?.[0].toString() == values[0].toString()) {
            response = await sheets.spreadsheets.values.append({
                spreadsheetId: sheetId,
                range: 'Sheet1', // Change to your desired sheet and range
                valueInputOption: 'RAW', // Use 'RAW' for unformatted data
                resource: { values }
            });
        } else {
            console.log("in else")
            response = await sheets.spreadsheets.values.append({
                spreadsheetId: sheetId,
                range: 'Sheet1', // Change to your desired sheet and range
                valueInputOption: 'RAW', // Use 'RAW' for unformatted data
                resource: { values }
            });
        }
        // Update Google Sheets
      

        // Check if the update was successful before deleting the file
        if (response.statusText === 'OK') {
            fs.unlinkSync(csvFilePath); // Delete the temporary uploaded CSV file
            res.json({ message: 'CSV uploaded and added to Google Sheets.' });
        } else {
            res.status(500).json({ message: 'Error updating Google Sheets.' });
        }
    } catch (error) {
        console.error('Error processing CSV:', error);
        res.status(500).json({ message: 'Error processing CSV.' });
    }
    // res.status('File uploaded successfully!');

});



// Handle Chart Email
app.post('/send-email', (req, res) => {
    console.log("is hereee", req)
    const userEmail = req.body.email;
   if(req.body.sendEmail === 'on') {
    const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'stackitemailtest@gmail.com',
        pass: 'nslmuwybblaimjdf'
    }
    });

    const mailOptions = {
    from: 'stackitemailtest@gmail.com',
    to: userEmail,
    subject: 'Chart Update',
    //text: 'Here is the updated chart:',
    html: { path: './chart.html' }
    };

    transporter.sendMail(mailOptions, function(error, info){
    if (error) {
    console.log(error);
    } else {
        console.log('Email sent: ' + info.response);
        
    }
    });
   }

  res.redirect('/');
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
