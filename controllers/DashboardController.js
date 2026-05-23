const db = require('../db');

const getDashboardStats = async (req, res) => {
  try {
    const [[members]] = await db.promise().query('SELECT COUNT(*) AS count FROM Members');
    const [[leaders]] = await db.promise().query(
      "SELECT COUNT(*) AS count FROM leaders WHERE isDeleted = 'false'"
    );
    const [[groups]] = await db.promise().query('SELECT COUNT(*) AS count FROM Groups');
    const [[activities]] = await db.promise().query('SELECT COUNT(*) AS count FROM activities');
    const [[cards]] = await db.promise().query('SELECT COUNT(*) AS count FROM activity_cards');

    let pendingContacts = 0;
    try {
      const [[contacts]] = await db.promise().query(
        "SELECT COUNT(*) AS count FROM contact_requests WHERE status = 'pending'"
      );
      pendingContacts = contacts.count;
    } catch {
      pendingContacts = 0;
    }

    const [recentActivities] = await db.promise().query(
      `SELECT id, title, date, location, participants_count, created_at
       FROM activities ORDER BY created_at DESC LIMIT 5`
    );

    const [groupsBreakdown] = await db.promise().query(
      `SELECT g.name AS group_name, COUNT(m.id) AS member_count
       FROM Groups g
       LEFT JOIN Members m ON m.group_id = g.id
       GROUP BY g.id, g.name`
    );

    return res.status(200).json({
      members: members.count,
      leaders: leaders.count,
      groups: groups.count,
      activities: activities.count,
      activityCards: cards.count,
      pendingContacts,
      recentActivities,
      groupsBreakdown,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'خطأ في جلب الإحصائيات' });
  }
};

module.exports = { getDashboardStats };
