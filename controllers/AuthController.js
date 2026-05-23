const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const Login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json("Empty fields!");
    }

    let query;
    let params = [email];

    if (role === "leader") {
      query = "SELECT * FROM leaders WHERE email = ?";
    } 
    else if (role === "member") {
      query = "SELECT * FROM Members WHERE email = ?";
    } 
    else if (role === "moderator" || role === "superadmin") {
      query = "SELECT * FROM Admin WHERE email = ? AND role = ?";
      params.push(role);
    } 
    else {
      return res.status(400).json("Invalid role");
    }

    db.query(query, params, async (err, results) => {
      if (err) {
        return res.status(500).json("Database error");
      }

      if (!results.length) {
        return res.status(400).json("User not found");
      }

      const user = results[0];

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json("Incorrect password");
      }

      const userRole = user.role || role;

      let groupId = null;
      let groupName = null;
      const { getGroupByLeaderId } = require('../utils/permissions');

      if (userRole === 'leader') {
        const group = await getGroupByLeaderId(user.id);
        if (group) {
          groupId = group.id;
          groupName = group.name;
        }
      } else if (userRole === 'member') {
        const [memberGroups] = await db.promise().query(
          `SELECT g.id, g.name FROM Groups g
           JOIN Members m ON m.group_id = g.id WHERE m.id = ? LIMIT 1`,
          [user.id]
        );
        if (memberGroups[0]) {
          groupId = memberGroups[0].id;
          groupName = memberGroups[0].name;
        }
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: userRole, groupId, groupName },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        id: user.id,
        email: user.email,
        name: user.name,
        photo: user.photo,
        role: userRole,
        groupId,
        groupName,
        token,
      });
    });

  } catch (err) {
    return res.status(500).json("Server error");
  }
};


module.exports = Login;
