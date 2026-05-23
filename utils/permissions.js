const db = require('../db');

const getGroupByLeaderId = async (leaderId) => {
  const [rows] = await db.promise().query(
    'SELECT id, name FROM Groups WHERE leader_id = ? LIMIT 1',
    [leaderId]
  );
  return rows[0] || null;
};

const getGroupIdByName = async (groupName) => {
  const [rows] = await db.promise().query(
    'SELECT id, name FROM Groups WHERE name = ? LIMIT 1',
    [groupName]
  );
  return rows[0] || null;
};

const leaderOwnsGroup = async (leaderId, groupId) => {
  const group = await getGroupByLeaderId(leaderId);
  return group && Number(group.id) === Number(groupId);
};

const leaderOwnsActivityCard = async (leaderId, cardId) => {
  const [rows] = await db.promise().query(
    'SELECT id FROM activity_cards WHERE id = ? AND leader_id = ?',
    [cardId, leaderId]
  );
  return rows.length > 0;
};

const leaderOwnsActivity = async (leaderId, activityId) => {
  const [rows] = await db.promise().query(
    `SELECT a.id FROM activities a
     JOIN activity_cards ac ON a.activity_card_id = ac.id
     WHERE a.id = ? AND ac.leader_id = ?`,
    [activityId, leaderId]
  );
  return rows.length > 0;
};

module.exports = {
  getGroupByLeaderId,
  getGroupIdByName,
  leaderOwnsGroup,
  leaderOwnsActivityCard,
  leaderOwnsActivity,
};
