const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const morgan = require('morgan');
const programRoute = require('./Routes/Projects');
const blogRoute = require('./Routes/Blog');
const partnerImage = require('./Routes/Partner_Image');
const galleryCatRouter = require('./Routes/GalleryCat');
const galleryRouter = require('./Routes/Gallery');
const adminRoute = require('./Routes/Admin');
const cookieParser = require('cookie-parser');



const PORT = process.env.PORT || 5000;
dotenv.config
const app = express()



// MiddleWare

app.use(express.json())
app.use(morgan())
app.use(cors())
app.use(cookieParser())



app.use("/api", programRoute)
app.use("/api", blogRoute)
app.use("/api", partnerImage)
app.use("/api", partnerImage)
app.use("/api", galleryCatRouter)
app.use("/api", galleryRouter)
app.use("/api", adminRoute)










app.listen(PORT, function(){
    console.log(`Server is running on port ${PORT}`);
})






