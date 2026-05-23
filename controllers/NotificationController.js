const db = require('../db');
const { isStaff } = require('../middleware/authMiddleware');

const getSummary = async (req, res) => {
  try {
    const summary = { pendingContacts: 0, items: [] };

    if (isStaff(req.user.role)) {
      try {
        const [[row]] = await db.promise().query(
          "SELECT COUNT(*) AS count FROM contact_requests WHERE status = 'pending'"
        );
        summary.pendingContacts = row?.count || 0;
        if (summary.pendingContacts > 0) {
          summary.items.push({
            type: 'contact',
            count: summary.pendingContacts,
            message: `${summary.pendingContacts} طلب انضمام بانتظار المراجعة`,
            link: '/dashboard',
          });
        }
      } catch (e) {
        if (e.code !== 'ER_NO_SUCH_TABLE') throw e;
      }
    }

    return res.status(200).json(summary);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

module.exports = { getSummary };
