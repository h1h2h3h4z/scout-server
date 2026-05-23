const db = require('../db');
const { getGroupByLeaderId } = require('../utils/permissions');

const fetchExplore = async () => {
  const [groups] = await db.promise().query(`
    SELECT 
      Groups.id AS GROUPID,
      Groups.name AS GROUPNAME,
      leaders.name AS LEADERNAME,
      leaders.photo AS LEADERPHOTO,
      COUNT(Members.id) AS MEMBERS_COUNT
    FROM Groups
    JOIN leaders ON Groups.leader_id = leaders.id
    LEFT JOIN Members ON Members.group_id = Groups.id
    GROUP BY Groups.id
    ORDER BY Groups.name
  `);

  const [activities] = await db.promise().query(`
    SELECT a.id, a.title, a.description, a.date, a.location, a.participants_count,
           ac.activity_title AS card_title, ac.domain AS category,
           g.name AS group_name
    FROM activities a
    LEFT JOIN activity_cards ac ON a.activity_card_id = ac.id
    LEFT JOIN leaders l ON ac.leader_id = l.id
    LEFT JOIN Groups g ON g.leader_id = l.id
    ORDER BY a.created_at DESC
    LIMIT 20
  `);

  return { groups: groups || [], activities: activities || [] };
};

const getPortal = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const explore = await fetchExplore();
    let mine = null;

    if (role === 'leader') {
      const group = await getGroupByLeaderId(userId);
      if (!group) {
        return res.status(200).json({
          user: req.user,
          mine: { group: null, members: [], activityCards: [], activities: [], stats: {} },
          explore,
        });
      }

      const [[memberStats]] = await db.promise().query(
        'SELECT COUNT(*) AS count FROM Members WHERE group_id = ?',
        [group.id]
      );

      const [members] = await db.promise().query(
        `SELECT id, name, phone, photo, birthdate, createdAt AS created_at
         FROM Members WHERE group_id = ? ORDER BY createdAt DESC LIMIT 12`,
        [group.id]
      );

      const [activityCards] = await db.promise().query(
        `SELECT id, activity_title, domain, location, duration, Datetime, createdAt
         FROM activity_cards WHERE leader_id = ? ORDER BY createdAt DESC`,
        [userId]
      );

      const [activities] = await db.promise().query(
        `SELECT a.id, a.title, a.date, a.location, a.participants_count, ac.activity_title AS card_title
         FROM activities a
         JOIN activity_cards ac ON a.activity_card_id = ac.id
         WHERE ac.leader_id = ?
         ORDER BY a.created_at DESC`,
        [userId]
      );

      const [leaderRow] = await db.promise().query(
        'SELECT name, email, phone, photo FROM leaders WHERE id = ?',
        [userId]
      );

      mine = {
        group: {
          id: group.id,
          name: group.name,
          memberCount: memberStats?.count || 0,
          leader: leaderRow[0] || null,
        },
        members,
        activityCards,
        activities,
        stats: {
          members: memberStats?.count || 0,
          activityCards: activityCards.length,
          activities: activities.length,
        },
      };
    } else if (role === 'member') {
      const [memberRows] = await db.promise().query(
        `SELECT m.id, m.name, m.phone, m.email, m.photo, m.birthdate, m.createdAt,
                m.group_id, g.name AS group_name, l.name AS leader_name, l.phone AS leader_phone
         FROM Members m
         LEFT JOIN Groups g ON g.id = m.group_id
         LEFT JOIN leaders l ON l.id = g.leader_id
         WHERE m.id = ?`,
        [userId]
      );

      const member = memberRows[0];
      if (!member?.group_id) {
        return res.status(200).json({
          user: req.user,
          mine: { profile: member || null, group: null, teammates: [], stats: {} },
          explore,
        });
      }

      const [teammates] = await db.promise().query(
        `SELECT id, name, phone, photo, birthdate
         FROM Members WHERE group_id = ? AND id != ? ORDER BY name LIMIT 20`,
        [member.group_id, userId]
      );

      const [[countRow]] = await db.promise().query(
        'SELECT COUNT(*) AS count FROM Members WHERE group_id = ?',
        [member.group_id]
      );

      const [groupActivities] = await db.promise().query(
        `SELECT a.id, a.title, a.description, a.date, a.location, a.participants_count,
                ac.activity_title AS card_title, ac.domain AS category
         FROM activities a
         JOIN activity_cards ac ON a.activity_card_id = ac.id
         JOIN Groups g ON g.leader_id = ac.leader_id
         WHERE g.id = ?
         ORDER BY a.date DESC, a.created_at DESC LIMIT 15`,
        [member.group_id]
      );

      const [upcoming] = await db.promise().query(
        `SELECT a.id, a.title, a.date, a.location
         FROM activities a
         JOIN activity_cards ac ON a.activity_card_id = ac.id
         JOIN Groups g ON g.leader_id = ac.leader_id
         WHERE g.id = ? AND a.date >= CURDATE()
         ORDER BY a.date ASC LIMIT 5`,
        [member.group_id]
      );

      const [leaderInfo] = await db.promise().query(
        `SELECT l.name, l.phone, l.email, l.photo
         FROM leaders l
         JOIN Groups g ON g.leader_id = l.id
         WHERE g.id = ?`,
        [member.group_id]
      );

      let announcements = [];
      try {
        const [ann] = await db.promise().query(
          `SELECT id, title, body, is_pinned, created_at
           FROM group_announcements WHERE group_id = ?
           ORDER BY is_pinned DESC, created_at DESC LIMIT 10`,
          [member.group_id]
        );
        announcements = ann;
      } catch (e) {
        if (e.code !== 'ER_NO_SUCH_TABLE') throw e;
      }

      const joinedAt = member.createdAt || member.created_at;
      let memberSinceDays = 0;
      if (joinedAt) {
        memberSinceDays = Math.floor(
          (Date.now() - new Date(joinedAt).getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      const activityCount = groupActivities.length;
      let scoutRank = 'كشاف جديد';
      let scoutRankLevel = 1;
      if (activityCount >= 5) {
        scoutRank = 'كشاف متميز';
        scoutRankLevel = 3;
      } else if (activityCount >= 1 || memberSinceDays >= 30) {
        scoutRank = 'كشاف نشط';
        scoutRankLevel = 2;
      }

      const badges = [];
      if (memberSinceDays >= 7) badges.push({ id: 'week', label: 'أسبوع مع الفرقة', icon: '🌟' });
      if (memberSinceDays >= 30) badges.push({ id: 'month', label: 'شهر في الفرقة', icon: '🏅' });
      if (activityCount >= 1) badges.push({ id: 'first-activity', label: 'أول نشاط', icon: '🎯' });
      if (activityCount >= 3) badges.push({ id: 'active', label: 'عضو نشيط', icon: '⚡' });

      mine = {
        profile: {
          id: member.id,
          name: member.name,
          phone: member.phone,
          email: member.email,
          photo: member.photo,
          birthdate: member.birthdate,
          joinedAt,
          memberSinceDays,
          scoutRank,
          scoutRankLevel,
          badges,
        },
        group: {
          id: member.group_id,
          name: member.group_name,
          leaderName: member.leader_name,
          leaderPhone: member.leader_phone,
          leaderPhoto: leaderInfo[0]?.photo || null,
          leaderEmail: leaderInfo[0]?.email || null,
          memberCount: countRow?.count || 0,
        },
        teammates,
        groupActivities,
        upcomingActivities: upcoming,
        announcements,
        stats: {
          teammates: teammates.length,
          groupActivities: groupActivities.length,
          upcoming: upcoming.length,
          announcements: announcements.length,
        },
      };
    } else {
      return res.status(403).json({ message: 'هذه الصفحة للقادة والأعضاء فقط' });
    }

    return res.status(200).json({ user: req.user, mine, explore });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

module.exports = { getPortal };
