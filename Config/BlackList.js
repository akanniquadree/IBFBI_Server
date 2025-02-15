const db = require("./Db_Config")





const addToBlacklistToken = (token) =>{
    const q = "INSERT INTO blacklistToken (token) VALUES = ?"
    db.query(q, [token],(err) => {
        if (err) console.error("Error blacklisting token:", err);
    });
}
const isBlackListed = (token, cb) =>{
    const q = "SELECT * FROM blacklistToken where token = ?"
    db.query(q, [token], function(err, data){
        if (err) {
            console.error("Database Error:", err);
            return cb(false);
        }
        cb(data.length > 0)
    })
}



module.exports = {addToBlacklistToken, isBlackListed}
