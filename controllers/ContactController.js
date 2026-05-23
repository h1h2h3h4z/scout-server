const db = require('../db');

const submitContact = async (req, res) => {
  try {
    const { name, phone, email, age, preferred_group, message } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ message: 'الاسم ورقم الهاتف مطلوبان' });
    }

    const query = `
      INSERT INTO contact_requests (name, phone, email, age, preferred_group, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await db.promise().query(query, [
      name,
      phone,
      email || null,
      age || null,
      preferred_group || null,
      message || null,
    ]);

    return res.status(201).json({ message: 'تم إرسال طلبك بنجاح! سنتواصل معك قريباً.' });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        message: 'جدول contact_requests غير موجود. نفّذ database/migrations.sql',
      });
    }
    console.error(err);
    return res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

const getContactRequests = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM contact_requests ORDER BY created_at DESC'
    );
    return res.status(200).json(rows);
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(200).json([]);
    }
    return res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['pending', 'reviewed', 'accepted', 'rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'حالة غير صالحة' });
    }
    await db.promise().query('UPDATE contact_requests SET status = ? WHERE id = ?', [
      status,
      id,
    ]);
    const [rows] = await db.promise().query('SELECT * FROM contact_requests WHERE id = ?', [
      id,
    ]);
    const row = rows[0];
    const payload = { ...row };
    if (status === 'accepted') {
      payload.nextStep =
        'لم يُضف العضو تلقائياً. انتقل إلى «إضافة عضو» وأكمل الصورة وكلمة المرور والفرقة.';
    }
    return res.status(200).json(payload);
  } catch (err) {
    return res.status(500).json({ message: 'خطأ في التحديث' });
  }
};

const linkContactToMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body;
    if (!memberId) {
      return res.status(400).json({ message: 'معرّف العضو مطلوب' });
    }

    await db.promise().query(
      'UPDATE contact_requests SET status = ?, member_id = ? WHERE id = ?',
      ['accepted', memberId, id]
    );

    const [rows] = await db.promise().query('SELECT * FROM contact_requests WHERE id = ?', [id]);
    return res.status(200).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({
        message: 'أضف عمود member_id: نفّذ database/migrations.sql',
      });
    }
    return res.status(500).json({ message: 'خطأ في التحديث' });
  }
};

module.exports = { submitContact, getContactRequests, updateContactStatus, linkContactToMember };
