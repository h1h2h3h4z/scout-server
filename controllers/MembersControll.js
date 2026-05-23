const db = require("../db");
const bcrypt = require('bcrypt');
const { getGroupByLeaderId, getGroupIdByName, leaderOwnsGroup } = require('../utils/permissions');
const AddLeader = async (req, res) => {
  try {
    const { leaderName, leaderBirthdate, leaderphone, leaderemail, leaderTeam ,leaderPassword} = req.body;
    const photo = req.file?.filename;

    if (!leaderName || !leaderphone || !leaderBirthdate || !leaderemail || !leaderPassword || !photo) {
      return res.status(400).json("يرجى إدخال جميع البيانات");
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(leaderPassword, saltRounds);
    // أولاً: إدخال القائد
    const insertLeaderQuery = "INSERT INTO `leaders`(`name`, `email`,`password`, `phone`, `dateofbirth`, `photo`) VALUES (?, ?,? , ?, ?, ?)";
    const [leaderResult] = await db.promise().query(insertLeaderQuery, [
      leaderName,
      leaderemail,
      hashedPassword,
      leaderphone,
      leaderBirthdate,
      photo
    ]);

    const leaderId = leaderResult.insertId;

    if (leaderResult.affectedRows > 0) {
      // ثانياً: إنشاء الفرقة
      const insertGroupQuery = "INSERT INTO `Groups`(`name`, `leader_id`) VALUES (?, ?)";
      const [groupResult] = await db.promise().query(insertGroupQuery, [leaderTeam, leaderId]);

      if (groupResult.affectedRows > 0) {
        // ثالثاً: جلب البيانات المدمجة للقائد والفرقة
        const selectQuery = `
          SELECT 
            leaders.id, 
            leaders.name AS leaderName, 
            leaders.email, 
            leaders.phone, 
            leaders.dateofbirth, 
            leaders.photo, 
            Groups.name AS teamName 
          FROM leaders 
          JOIN Groups ON leaders.id = Groups.leader_id 
          WHERE leaders.id = ? AND leaders.isDeleted = 'false'
        `;

        const [rows] = await db.promise().query(selectQuery, [leaderId]);

        if (rows.length > 0) {
          const newGroupLeader = {
            id: rows[0].id,
            name: rows[0].leaderName,
            birthdate: rows[0].dateofbirth,
            phone: rows[0].phone,
            email: rows[0].email,
            photo: rows[0].photo,
            teamName: rows[0].teamName,
          };

          return res.status(201).json(newGroupLeader);
        }
      }
    }

    return res.status(500).json("فشل في إضافة القائد أو الفريق");
  } catch (err) {
   
    return res.status(500).json("خطأ داخلي في الخادم");
  }
};


const getMembers = async (req, res) => {
    try {
      const query = "SELECT * FROM Members";
      const [result] = await db.promise().query(query);
  
      if (result.length === 0) {
        return res.status(404).json("No members found");
      }
  
      const members = result.map(member => ({
        id: member.id,
        name: member.name,
        birthdate: member.birthdate,
        
      }));
  
      return res.status(200).json(members);
    } catch (err) {
      console.error("Error fetching members:", err);
      return res.status(500).json("Internal server error");
    }
  };
  const getLeaders = async (req, res) => {
    try {
      const query = `
      SELECT 
        leaders.id, 
        leaders.name AS leaderName, 
        leaders.email, 
        leaders.phone, 
        leaders.dateofbirth, 
        leaders.photo, 
        Groups.name AS teamName 
      FROM leaders 
      JOIN Groups ON leaders.id = Groups.leader_id WHERE leaders.isDeleted = 'false'
      
    `;      const [result] = await db.promise().query(query);
  
      if (result.length === 0) {
        return res.status(200).json([]);
      }
  
      const leaders = result.map(leader => ({
        id: leader.id,
        name: leader.leaderName,
        birthdate: leader.dateofbirth,
        phone: leader.phone,
        email: leader.email,
        photo: leader.photo,
        teamName: leader.teamName,
      }));
  
      return res.status(200).json(leaders);
    } catch (err) {
      console.error("Error fetching leaders:", err);
      return res.status(500).json("Internal server error");
    }
  };
  const deleteLeader = async (req, res) => {
    try {
      const id = req.params.id;
  
      // Execute the DELETE query
      const deleteQuery = "UPDATE `leaders` SET isDeleted = 'true' WHERE id =?";
      await db.promise().query(deleteQuery, [id]);
  
      // Fetch updated list of leaders
      const selectQuery = `
        SELECT 
          leaders.id, 
          leaders.name AS leaderName, 
          leaders.email, 
          leaders.phone, 
          leaders.dateofbirth, 
          leaders.photo, 
          Groups.name AS teamName 
        FROM leaders 
        JOIN Groups ON leaders.id = Groups.leader_id WHERE isDeleted = 'false'
      `;
  
      const [result] = await db.promise().query(selectQuery);
  
      if (result.length === 0) {
        return res.status(200).json([]);
      }
  
      const leaders = result.map(leader => ({
        id: leader.id,
        name: leader.leaderName,
        birthdate: leader.dateofbirth,
        phone: leader.phone,
        email: leader.email,
        photo: leader.photo,
        teamName: leader.teamName,
      }));
  
      return res.status(200).json(leaders);
    } catch (err) {
      console.error(err);
      return res.status(500).json("Internal server error");
    }
  };
  
  const deleteMember = async (req, res) => {
    try {
      const { id } = req.params;

      if (req.user?.role === 'leader') {
        const [memberRow] = await db.promise().query(
          'SELECT group_id FROM Members WHERE id = ?',
          [id]
        );
        if (!memberRow.length || !(await leaderOwnsGroup(req.user.id, memberRow[0].group_id))) {
          return res.status(403).json({ message: 'لا يمكنك حذف عضو من فرقة أخرى' });
        }
      }

      const [result] = await db.promise().query('DELETE FROM Members WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'العضو غير موجود' });
      }
      return res.status(200).json({ message: 'تم حذف العضو بنجاح' });
    } catch (err) {
      return res.status(500).json({ message: 'خطأ في الخادم' });
    }
  };

  const updateMember = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, birthdate, phone, email, category } = req.body;
      const photo = req.file?.filename;

      let groupId = null;
      if (category) {
        const group = await getGroupIdByName(category);
        if (!group) {
          return res.status(400).json({ message: 'الفرقة غير موجودة' });
        }
        if (req.user?.role === 'leader') {
          const owns = await leaderOwnsGroup(req.user.id, group.id);
          if (!owns) {
            return res.status(403).json({ message: 'لا يمكنك نقل العضو لفرقة أخرى' });
          }
        }
        groupId = group.id;
      }

      if (req.user?.role === 'leader') {
        const [memberRow] = await db.promise().query(
          'SELECT group_id FROM Members WHERE id = ?',
          [id]
        );
        if (memberRow.length && !(await leaderOwnsGroup(req.user.id, memberRow[0].group_id))) {
          return res.status(403).json({ message: 'لا يمكنك تعديل عضو من فرقة أخرى' });
        }
      }

      const fields = [];
      const values = [];
      if (name) { fields.push('name = ?'); values.push(name); }
      if (birthdate) { fields.push('birthdate = ?'); values.push(birthdate); }
      if (phone) { fields.push('phone = ?'); values.push(phone); }
      if (email) { fields.push('email = ?'); values.push(email); }
      if (photo) { fields.push('photo = ?'); values.push(photo); }
      if (groupId) { fields.push('group_id = ?'); values.push(groupId); }

      if (fields.length === 0) {
        return res.status(400).json({ message: 'لا توجد بيانات للتحديث' });
      }

      values.push(id);
      await db.promise().query(
        `UPDATE Members SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      return res.status(200).json({ message: 'تم تحديث العضو بنجاح' });
    } catch (err) {
      return res.status(500).json({ message: 'خطأ في الخادم' });
    }
  };

  const AddMember = async (req, res) => {
    try {
      const { name, birthdate, phone,email,password, category } = req.body;
      const photo = req.file?.filename;
  
      if (!name || !birthdate || !phone || !category || !email || !password || !photo) {
        return res.status(400).json("All fields are required.");
      }

      let groupId;
      if (req.user?.role === 'leader') {
        const leaderGroup = await getGroupByLeaderId(req.user.id);
        if (!leaderGroup) {
          return res.status(403).json({ message: 'لا توجد فرقة مرتبطة بحسابك' });
        }
        if (category !== leaderGroup.name) {
          return res.status(403).json({ message: 'لا يمكنك إضافة أعضاء لفرقة أخرى' });
        }
        groupId = leaderGroup.id;
      } else {
        const group = await getGroupIdByName(category);
        if (!group) {
          return res.status(400).json("This group does not exist.");
        }
        groupId = group.id;
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
  
      const insertQuery = `
        INSERT INTO Members (name, birthdate, phone,email,password,photo, group_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const [result] = await db.promise().query(insertQuery, [
        name,
        birthdate,
        phone,
        email,
        hashedPassword,
        photo,
        groupId,
      ]);

      return res.status(201).json({
        message: 'Member added successfully.',
        memberId: result.insertId,
        groupId,
      });
    } catch (err) {
      return res.status(500).json("Internal server error" );
    }
  };
  
const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    if (role === 'member') {
      const [rows] = await db.promise().query(
        `SELECT m.id, m.name, m.birthdate, m.phone, m.email, m.photo, m.group_id,
                g.name AS group_name, l.name AS leader_name
         FROM Members m
         LEFT JOIN Groups g ON g.id = m.group_id
         LEFT JOIN leaders l ON l.id = g.leader_id
         WHERE m.id = ?`,
        [userId]
      );
      if (!rows.length) return res.status(404).json({ message: 'العضو غير موجود' });
      return res.status(200).json(rows[0]);
    }

    if (role === 'leader') {
      const group = await getGroupByLeaderId(userId);
      const [rows] = await db.promise().query(
        'SELECT id, name, email, phone, dateofbirth AS birthdate, photo FROM leaders WHERE id = ?',
        [userId]
      );
      if (!rows.length) return res.status(404).json({ message: 'القائد غير موجود' });
      return res.status(200).json({ ...rows[0], group_id: group?.id, group_name: group?.name, role: 'leader' });
    }

    return res.status(403).json({ message: 'غير متاح لهذا الدور' });
  } catch (err) {
    return res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { name, phone, birthdate, password } = req.body;
    const photo = req.file?.filename;

    if (role === 'member') {
      const fields = [];
      const values = [];
      if (name) { fields.push('name = ?'); values.push(name); }
      if (phone) { fields.push('phone = ?'); values.push(phone); }
      if (birthdate) { fields.push('birthdate = ?'); values.push(birthdate); }
      if (photo) { fields.push('photo = ?'); values.push(photo); }
      if (password) {
        fields.push('password = ?');
        values.push(await bcrypt.hash(password, 10));
      }
      if (!fields.length) {
        return res.status(400).json({ message: 'لا توجد بيانات للتحديث' });
      }
      values.push(userId);
      await db.promise().query(`UPDATE Members SET ${fields.join(', ')} WHERE id = ?`, values);
      const [rows] = await db.promise().query(
        `SELECT m.id, m.name, m.birthdate, m.phone, m.email, m.photo, m.group_id, g.name AS group_name
         FROM Members m LEFT JOIN Groups g ON g.id = m.group_id WHERE m.id = ?`,
        [userId]
      );
      return res.status(200).json(rows[0]);
    }

    if (role === 'leader') {
      const fields = [];
      const values = [];
      if (name) { fields.push('name = ?'); values.push(name); }
      if (phone) { fields.push('phone = ?'); values.push(phone); }
      if (birthdate) { fields.push('dateofbirth = ?'); values.push(birthdate); }
      if (photo) { fields.push('photo = ?'); values.push(photo); }
      if (password) {
        fields.push('password = ?');
        values.push(await bcrypt.hash(password, 10));
      }
      if (!fields.length) {
        return res.status(400).json({ message: 'لا توجد بيانات للتحديث' });
      }
      values.push(userId);
      await db.promise().query(`UPDATE leaders SET ${fields.join(', ')} WHERE id = ?`, values);
      const [rows] = await db.promise().query(
        'SELECT id, name, email, phone, dateofbirth AS birthdate, photo FROM leaders WHERE id = ?',
        [userId]
      );
      return res.status(200).json({ ...rows[0], role: 'leader' });
    }

    return res.status(403).json({ message: 'غير متاح' });
  } catch (err) {
    return res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

const getMemberById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.promise().query(
      `SELECT m.id, m.name, m.birthdate, m.phone, m.email, m.photo, m.group_id, g.name AS group_name
       FROM Members m
       LEFT JOIN Groups g ON g.id = m.group_id
       WHERE m.id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'العضو غير موجود' });

    if (req.user?.role === 'leader') {
      const owns = await leaderOwnsGroup(req.user.id, rows[0].group_id);
      if (!owns) return res.status(403).json({ message: 'لا يمكنك عرض هذا العضو' });
    }

    return res.status(200).json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

module.exports = {
    getMembers,
    AddLeader,
    getLeaders,
    AddMember,
    deleteLeader,
    deleteMember,
    updateMember,
    getMyProfile,
    updateMyProfile,
    getMemberById,
}