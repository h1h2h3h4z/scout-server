const db = require("../db");
const bcrypt = require("bcrypt");
const createAdmin = async (req, res) => {
    try {
      const { name, email, password, phone, role, birthDate } = req.body;
      const photo = req.file?.filename;
  
      if (!name || !email || !password || !role || !phone || !birthDate || !photo) {
        return res.status(400).json("يرجى إدخال جميع البيانات");
      }
  
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
  
      const insertLeaderAdmin = `
        INSERT INTO \`Admin\`(\`name\`, \`role\`, \`email\`, \`password\`, \`phone\`, \`photo\`, \`dateofbirth\`)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
  
      const [Adminresult] = await db.promise().query(insertLeaderAdmin, [
        name, role, email, hashedPassword, phone, photo, birthDate
      ]);
  
      if (Adminresult.affectedRows > 0) {
        return res.status(200).json(`Added ${role} Successfully`);
      }
  
      return res.status(400).json(`Failed Added ${role}`);
  
    } catch (err) {
      console.log(err);
      return res.status(500).json("خطأ داخلي في الخادم");
    }
  };
  
module.exports = {createAdmin}
