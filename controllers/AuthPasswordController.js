const db = require('../db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const roleTable = {
  member: { table: 'Members', emailCol: 'email' },
  leader: { table: 'leaders', emailCol: 'email' },
  moderator: { table: 'Admin', emailCol: 'email', extra: "AND role = 'moderator'" },
  superadmin: { table: 'Admin', emailCol: 'email', extra: "AND role = 'superadmin'" },
};

const forgotPassword = async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !role || !roleTable[role]) {
      return res.status(400).json({ message: 'البريد والدور مطلوبان' });
    }

    const cfg = roleTable[role];
    const extra = cfg.extra || '';
    const [users] = await db.promise().query(
      `SELECT id FROM ${cfg.table} WHERE ${cfg.emailCol} = ? ${extra} LIMIT 1`,
      [email]
    );

    if (!users.length) {
      return res.status(404).json({ message: 'لا يوجد حساب بهذا البريد' });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    try {
      await db.promise().query(
        'INSERT INTO password_resets (email, role, token, expires_at) VALUES (?, ?, ?, ?)',
        [email, role, token, expires]
      );
    } catch (e) {
      if (e.code === 'ER_NO_SUCH_TABLE') {
        return res.status(500).json({
          message: 'جدول password_resets غير موجود. نفّذ database/migrations.sql',
        });
      }
      throw e;
    }

    return res.status(200).json({
      message: 'تم إنشاء رمز استعادة. استخدمه خلال ساعة.',
      resetToken: token,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, role, token, newPassword } = req.body;
    if (!email || !role || !token || !newPassword) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'كلمة المرور 6 أحرف على الأقل' });
    }

    const [resets] = await db.promise().query(
      `SELECT * FROM password_resets
       WHERE email = ? AND role = ? AND token = ? AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [email, role, token]
    );

    if (!resets.length) {
      return res.status(400).json({ message: 'رمز غير صالح أو منتهي' });
    }

    const cfg = roleTable[role];
    const extra = cfg.extra || '';
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.promise().query(
      `UPDATE ${cfg.table} SET password = ? WHERE ${cfg.emailCol} = ? ${extra}`,
      [hashed, email]
    );

    await db.promise().query('DELETE FROM password_resets WHERE email = ? AND role = ?', [
      email,
      role,
    ]);

    return res.status(200).json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

module.exports = { forgotPassword, resetPassword };
