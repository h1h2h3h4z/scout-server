const db = require('../db');
const { getGroupByLeaderId } = require('../utils/permissions');

const getMyAnnouncements = async (req, res) => {
  try {
    let groupId = req.user.groupId;

    if (req.user.role === 'member') {
      const [rows] = await db.promise().query(
        'SELECT group_id FROM Members WHERE id = ?',
        [req.user.id]
      );
      groupId = rows[0]?.group_id;
    } else if (req.user.role === 'leader') {
      const g = await getGroupByLeaderId(req.user.id);
      groupId = g?.id;
    }

    if (!groupId) {
      return res.status(200).json([]);
    }

    const [items] = await db.promise().query(
      `SELECT a.*, l.name AS author_name
       FROM group_announcements a
       LEFT JOIN leaders l ON l.id = a.leader_id
       WHERE a.group_id = ?
       ORDER BY a.is_pinned DESC, a.created_at DESC
       LIMIT 30`,
      [groupId]
    );

    return res.status(200).json(items);
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(200).json([]);
    }
    console.error(err);
    return res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    const { title, body, is_pinned } = req.body;
    if (!title || !body) {
      return res.status(400).json({ message: 'العنوان والنص مطلوبان' });
    }

    const group = await getGroupByLeaderId(req.user.id);
    if (!group) {
      return res.status(403).json({ message: 'لا توجد فرقة مرتبطة بك' });
    }

    const [result] = await db.promise().query(
      `INSERT INTO group_announcements (group_id, leader_id, title, body, is_pinned)
       VALUES (?, ?, ?, ?, ?)`,
      [group.id, req.user.id, title, body, is_pinned ? 1 : 0]
    );

    const [rows] = await db.promise().query(
      `SELECT a.*, l.name AS author_name FROM group_announcements a
       LEFT JOIN leaders l ON l.id = a.leader_id WHERE a.id = ?`,
      [result.insertId]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        message: 'جدول group_announcements غير موجود. نفّذ database/migrations.sql',
      });
    }
    return res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await getGroupByLeaderId(req.user.id);
    if (!group) return res.status(403).json({ message: 'غير مصرح' });

    await db.promise().query(
      'DELETE FROM group_announcements WHERE id = ? AND group_id = ?',
      [id, group.id]
    );
    return res.status(200).json({ message: 'تم الحذف' });
  } catch (err) {
    return res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

module.exports = { getMyAnnouncements, createAnnouncement, deleteAnnouncement };
