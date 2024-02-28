const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
dotenv.config();
const authRoute = require('./routes/auth.route');
const taskRoute = require('./routes/task.route');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(cors(
    {
        origin:["https://project-management-app-supriya.netlify.app"],
        methods:["POST","GET","PUT"],
        credentials:true
    }
));
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json({ limit: '10mb' }))
app.set('view engine', 'ejs');

app.get('/health', (req, res) => {
    res.status(200).json({
        status: "SUCESS",
        message: "All Good"
    })
})

app.use('/auth', authRoute);

app.use('/task', taskRoute);

app.listen(process.env.PORT, () => {
    mongoose.connect(process.env.MONGODB_URL)
        .then(() => console.log(`Server running at http://localhost:${process.env.PORT}`))
        .catch((error) => console.log(error))
})





