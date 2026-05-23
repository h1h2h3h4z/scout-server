const db = require('../db');

const getGroups = async (req, res) => {
  try {
    const query = `
      SELECT 
        \`Groups\`.id AS GROUPID,
        \`Groups\`.name AS GROUPNAME,
        leaders.id AS LEADERID,
        leaders.name AS LEADERNAME,
        leaders.phone AS LEADERPHONE,
        leaders.email AS LEADEREMAIL,
        leaders.photo AS LEADERPHOTO,
        COUNT(Members.id) AS MEMBERS_COUNT
      FROM \`Groups\`
      JOIN leaders 
        ON \`Groups\`.leader_id = leaders.id
      LEFT JOIN Members 
        ON Members.group_id = \`Groups\`.id
      GROUP BY \`Groups\`.id;
    `;

    const [results] = await db.promise().query(query);

    if (results.length > 0) {
      return res.status(200).json(results);
    } else {
      return res.status(404).json("لا توجد فرق");
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json("حدث خطأ في الخادم الداخلي");
  }
};

const getGroupMembers = async (req, res) => {
  try {
    const id = req.params.id;

    const query = `
      SELECT 
        Members.id AS MEMBERID,
        Members.name AS MEMBERNAME,
        Members.birthdate AS MEMBERBIRTHDATE,
        Members.phone AS MEMBERPHONE,
        Members.email AS MEMBEREMAIL,
        Members.photo AS MEMBERPHOTO,
        Members.createdAt AS MEMBERCREATEDAT
      FROM Members
      JOIN \`Groups\` 
        ON \`Groups\`.id = Members.group_id
      WHERE Members.group_id = ?;
    `;

    const [results] = await db.promise().query(query, [id]);

    if (results.length > 0) {
      return res.status(200).json(results);
    } else {
      return res.status(200).json([]);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json("Internal server error");
  }
};

module.exports = { getGroups, getGroupMembers };