const db = require('../db');
const { isStaff } = require('../middleware/authMiddleware');
const {
  leaderOwnsActivityCard,
  leaderOwnsActivity,
} = require('../utils/permissions');

const ACTIVITY_CARD_JOIN = `
  ac.id AS card_id,
  ac.activity_title AS card_activity_title,
  ac.aspect AS card_aspect,
  ac.domain AS card_domain,
  ac.objective AS card_objective,
  ac.indicator AS card_indicator,
  ac.activity_type AS card_activity_type,
  ac.slogan AS card_slogan,
  ac.target_group AS card_target_group,
  ac.participants_count AS card_participants_count,
  ac.location AS card_location,
  ac.duration AS card_duration,
  ac.Datetime AS card_datetime,
  ac.createdAt AS card_created_at,
  l.name AS card_leader_name
`;

const cardSummaryFromRow = (row) => {
  if (!row.card_id) return null;
  return {
    id: row.card_id,
    activity_title: row.card_activity_title,
    aspect: row.card_aspect,
    domain: row.card_domain,
    objective: row.card_objective,
    indicator: row.card_indicator,
    activity_type: row.card_activity_type,
    slogan: row.card_slogan,
    target_group: row.card_target_group,
    participants_count: row.card_participants_count,
    location: row.card_location,
    duration: row.card_duration,
    Datetime: row.card_datetime,
    createdAt: row.card_created_at,
    leader_name: row.card_leader_name,
  };
};

const fetchActivityCardFull = async (cardId) => {
  if (!cardId) return null;

  const [cards] = await db.promise().query(
    `SELECT ac.*, l.name AS leader_name
     FROM activity_cards ac
     LEFT JOIN leaders l ON ac.leader_id = l.id
     WHERE ac.id = ?`,
    [cardId]
  );
  if (!cards.length) return null;

  const card = cards[0];
  const [program] = await db.promise().query(
    'SELECT time_from, time_to, content, technique_used FROM ProgramDetails WHERE activity_id = ? ORDER BY detail_id',
    [cardId]
  );
  const [equipment] = await db.promise().query(
    'SELECT item_name, quantity, estimated_cost FROM Equipment WHERE activity_id = ?',
    [cardId]
  );
  const [funding] = await db.promise().query(
    'SELECT source_name, value_type FROM FundingSources WHERE activity_id = ?',
    [cardId]
  );

  return {
    id: card.id,
    activity_title: card.activity_title,
    aspect: card.aspect,
    domain: card.domain,
    objective: card.objective,
    indicator: card.indicator,
    activity_type: card.activity_type,
    leader_name: card.leader_name,
    slogan: card.slogan,
    target_group: card.target_group,
    participants_count: card.participants_count,
    location: card.location,
    duration: card.duration,
    Datetime: card.Datetime,
    createdAt: card.createdAt,
    program,
    equipment,
    funding,
  };
};

const AddActivityCard = async (req, res) => {
    const {
        activityTitle, aspect, field, objective, indicator,
        activityType, activityLeader, slogan, targetGroup,
        location, equipment, funding, participantsCount,
        programDetails, timeAndDuration, activityDatetime
    } = req.body;
    if (!/^\d+$/.test(participantsCount)) {
        return res.status(400).json('participantsCount must contain only numbers');
      }
      for(let i = 0; i < funding.length; i++) {
        const { fundingValue } = funding[i];
        if (!/^\d+$/.test(fundingValue)) {
            return res.status(400).json('fundingValue must contain only numbers');
        }
      }
      for(let i = 0; i < equipment.length; i++) {
        const { quantity,estimatedCost } = equipment[i];
        if (!/^\d+$/.test(quantity)  || !/^\d+$/.test(estimatedCost)) {
            return res.status(400).json('quantity and estimatedCost must contain only numbers');
        }
      }
    
    const datetimeValue = activityDatetime
      ? `${activityDatetime.replace('T', ' ')}${activityDatetime.length === 16 ? ':00' : ''}`
      : null;

    let leaderId = activityLeader;
    if (req.user?.role === 'leader') {
      leaderId = req.user.id;
    } else if (!leaderId) {
      return res.status(400).json({ message: 'يجب تحديد قائد النشاط' });
    }

    const query = "INSERT INTO activity_cards (activity_title,aspect,domain,objective,indicator,activity_type,leader_id,slogan,target_group,participants_count,location,duration,Datetime) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)";
    const values = [activityTitle, aspect, field, objective, indicator, activityType, leaderId, slogan, targetGroup, participantsCount, location, timeAndDuration, datetimeValue];
    
    db.query(query, values, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json('Error adding activity card');
        }

        const activityId = result.insertId; // 📌 Capture activityId once

        // Insert Program Details
        for (let i = 0; i < programDetails.length; i++) {
            const { timingfrom, timingto, content, technique } = programDetails[i];
            const query2 = "INSERT INTO `ProgramDetails`(`activity_id`, `time_from`, `time_to`, `content`, `technique_used`) VALUES (?,?,?,?,?)";
            const values2 = [activityId, timingfrom, timingto, content, technique];

            db.query(query2, values2, (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json('Error adding program details');
                }
            });
        }

        // Insert Equipment
        for (let j = 0; j < equipment.length; j++) {
            const { equipmentType, quantity, estimatedCost } = equipment[j];
            const query3 = "INSERT INTO `Equipment`(`activity_id`, `item_name`, `quantity`, `estimated_cost`) VALUES (?,?,?,?)";
            const values3 = [activityId, equipmentType, quantity, estimatedCost];

            db.query(query3, values3, (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json('Error adding equipment');
                }
            });
        }

        // Insert Funding
        for (let k = 0; k < funding.length; k++) {
            const { fundingSource, fundingValue } = funding[k];
            const query4 = "INSERT INTO `FundingSources`(`activity_id`,`source_name`,`value_type`) VALUES (?,?,?)";
            const values4 = [activityId, fundingSource, fundingValue];

            db.query(query4, values4, (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json('Error adding funding');
                }
            });
        }

        // Done — respond success
        res.status(200).json('Activity card and related data added successfully');
    });
}
const AddActivity = async (req, res) => {
    const { title, description, date, location, participants_count, activity_card_id } = req.body;
    const photos = req.files;

    if (!activity_card_id) {
      return res.status(400).json({ message: 'بطاقة النشاط مطلوبة قبل إنشاء النشاط' });
    }

    const validateAndInsert = async () => {
      if (req.user?.role === 'leader') {
        const owns = await leaderOwnsActivityCard(req.user.id, activity_card_id);
        if (!owns) {
          return res.status(403).json({ message: 'بطاقة النشاط لا تخص فرقتك' });
        }
      } else {
        const [card] = await db.promise().query(
          'SELECT id FROM activity_cards WHERE id = ?',
          [activity_card_id]
        );
        if (!card.length) {
          return res.status(400).json({ message: 'بطاقة النشاط غير موجودة' });
        }
      }

    const query = "INSERT INTO `activities`(`title`, `description`, `date`, `location`, `participants_count`, `activity_card_id`) VALUES (?,?,?,?,?,?)";
    const values = [title, description, date, location, participants_count, activity_card_id];
  
    db.query(query, values, (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
  
      const activityId = result.insertId;
  
      // Check if photos were uploaded
      if (photos && photos.length > 0) {
        photos.forEach((photo) => {
          const query2 = "INSERT INTO `activity_photos`(`activity_id`, `photo_path`) VALUES (?,?)";
          const values2 = [activityId, photo.filename];
  
          db.query(query2, values2, (err) => {
            if (err) console.error("Error adding activity photo:", err.message);
          });
        });
      }
  
      const query3 = `
  SELECT activities.*, p.photo_path 
  FROM activities 
  LEFT JOIN activity_photos p ON activities.id = p.activity_id 
  WHERE activities.id = ?
`;

db.query(query3, [activityId], (err, result) => {
  if (err) return res.status(500).json({ message: err.message });

  if (result.length === 0) {
    return res.status(404).json({ message: "Activity not found" });
  }

  // Get activity info from first row
  const { photo_path, ...activityData } = result[0];

  // Collect all photo paths
  const photos = result
    .filter(row => row.photo_path) // Remove nulls if no photos
    .map(row => row.photo_path);

  res.status(200).json({
    ...activityData,
    photos,
  });
});

    });
    };

    validateAndInsert().catch((err) => {
      console.error(err);
      res.status(500).json({ message: 'خطأ في الخادم' });
    });
  };
  const mapActivityRows = (result, forStaff = false) => {
    const activities = [];
    result.forEach((row) => {
      let activity = activities.find((a) => a.id === row.id);
      if (!activity) {
        activity = {
          id: row.id,
          title: row.title,
          description: row.description,
          date: row.date,
          location: row.location,
          participants_count: row.participants_count,
          activity_card_id: row.activity_card_id,
          created_at: row.created_at,
          category: row.category || row.card_domain || 'عام',
          card_title: row.card_title || row.card_activity_title || null,
          photos: [],
        };
        if (forStaff) {
          activity.activity_card = cardSummaryFromRow(row);
        }
        activities.push(activity);
      }
      if (row.photo_path) {
        activity.photos.push(row.photo_path);
      }
    });
    return activities;
  };

  const getActivities = async (req, res) => {
    const staffView = req.user && isStaff(req.user.role);
    const query = `
      SELECT a.*, p.photo_path,
             ac.domain AS category, ac.activity_title AS card_title,
             ${staffView ? ACTIVITY_CARD_JOIN : 'NULL AS card_id'}
      FROM activities a
      LEFT JOIN activity_photos p ON a.id = p.activity_id
      LEFT JOIN activity_cards ac ON a.activity_card_id = ac.id
      ${staffView ? 'LEFT JOIN leaders l ON ac.leader_id = l.id' : ''}
      ORDER BY a.created_at DESC
    `;

    try {
      const [result] = await db.promise().query(query);
      const activities = mapActivityRows(result, staffView);

      if (staffView) {
        const cardIds = [...new Set(activities.map((a) => a.activity_card_id).filter(Boolean))];
        if (cardIds.length) {
          const [programs] = await db.promise().query(
            'SELECT activity_id, time_from, time_to, content, technique_used FROM ProgramDetails WHERE activity_id IN (?)',
            [cardIds]
          );
          const [equipment] = await db.promise().query(
            'SELECT activity_id, item_name, quantity, estimated_cost FROM Equipment WHERE activity_id IN (?)',
            [cardIds]
          );
          const [funding] = await db.promise().query(
            'SELECT activity_id, source_name, value_type FROM FundingSources WHERE activity_id IN (?)',
            [cardIds]
          );
          const groupBy = (rows, key) =>
            rows.reduce((acc, row) => {
              const id = row[key];
              const { [key]: _, ...rest } = row;
              if (!acc[id]) acc[id] = [];
              acc[id].push(rest);
              return acc;
            }, {});

          const programsByCard = groupBy(programs, 'activity_id');
          const equipmentByCard = groupBy(equipment, 'activity_id');
          const fundingByCard = groupBy(funding, 'activity_id');

          activities.forEach((a) => {
            if (a.activity_card?.id) {
              a.activity_card.program = programsByCard[a.activity_card.id] || [];
              a.activity_card.equipment = equipmentByCard[a.activity_card.id] || [];
              a.activity_card.funding = fundingByCard[a.activity_card.id] || [];
            }
          });
        }
      }

      res.status(200).json(activities);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  const getActivityById = async (req, res) => {
    const { id } = req.params;
    const staffView = req.user && isStaff(req.user.role);
    const query = `
      SELECT a.*, p.photo_path,
             ac.domain AS category, ac.activity_title AS card_title,
             ${staffView ? ACTIVITY_CARD_JOIN : 'NULL AS card_id'}
      FROM activities a
      LEFT JOIN activity_photos p ON a.id = p.activity_id
      LEFT JOIN activity_cards ac ON a.activity_card_id = ac.id
      ${staffView ? 'LEFT JOIN leaders l ON ac.leader_id = l.id' : ''}
      WHERE a.id = ?
    `;

    try {
      const [result] = await db.promise().query(query, [id]);
      if (!result.length) return res.status(404).json({ message: 'النشاط غير موجود' });

      const activities = mapActivityRows(result, staffView);
      let activity = activities[0];

      if (staffView && activity.activity_card_id) {
        activity.activity_card = await fetchActivityCardFull(activity.activity_card_id);
      }

      res.status(200).json(activity);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  const updateActivity = async (req, res) => {
    const { id } = req.params;
    let { title, description, date, location, participants_count, activity_card_id } = req.body;

    if (!activity_card_id) {
      const [existing] = await db.promise().query(
        'SELECT activity_card_id FROM activities WHERE id = ?',
        [id]
      );
      if (existing[0]?.activity_card_id) {
        activity_card_id = existing[0].activity_card_id;
      } else {
        return res.status(400).json({ message: 'بطاقة النشاط مطلوبة' });
      }
    }

    if (req.user?.role === 'leader') {
      if (!(await leaderOwnsActivity(req.user.id, id))) {
        return res.status(403).json({ message: 'لا يمكنك تعديل نشاط فرقة أخرى' });
      }
      if (!(await leaderOwnsActivityCard(req.user.id, activity_card_id))) {
        return res.status(403).json({ message: 'بطاقة النشاط لا تخص فرقتك' });
      }
    }

    const query = `
      UPDATE activities
      SET title = ?, description = ?, date = ?, location = ?,
          participants_count = ?, activity_card_id = ?
      WHERE id = ?
    `;
    const values = [
      title,
      description,
      date,
      location,
      participants_count,
      activity_card_id || null,
      id,
    ];

    db.query(query, values, (err) => {
      if (err) return res.status(500).json({ message: err.message });
      const fetchQuery = `
        SELECT a.*, p.photo_path, ac.domain AS category, ac.activity_title AS card_title
        FROM activities a
        LEFT JOIN activity_photos p ON a.id = p.activity_id
        LEFT JOIN activity_cards ac ON a.activity_card_id = ac.id
        WHERE a.id = ?
      `;
      db.query(fetchQuery, [id], async (fetchErr, result) => {
        if (fetchErr) return res.status(500).json({ message: fetchErr.message });
        let activity = mapActivityRows(result)[0];
        if (req.user && isStaff(req.user.role) && activity.activity_card_id) {
          activity.activity_card = await fetchActivityCardFull(activity.activity_card_id);
        }
        res.status(200).json(activity);
      });
    });
  };

  const deleteActivity = (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM activities WHERE id = ?', [id], (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'النشاط غير موجود' });
      }
      res.status(200).json({ message: 'تم حذف النشاط بنجاح' });
    });
  };
const getActivityCards = async (req, res) => {
  try {
    let query = 'SELECT * FROM activity_cards';
    const params = [];
    if (req.user?.role === 'leader') {
      query += ' WHERE leader_id = ?';
      params.push(req.user.id);
    }
    query += ' ORDER BY createdAt DESC';
    const [result] = await db.promise().query(query, params);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
module.exports = {
    AddActivityCard,
    AddActivity,
    getActivities,
    getActivityById,
    updateActivity,
    deleteActivity,
    getActivityCards
} 