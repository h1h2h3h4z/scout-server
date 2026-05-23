const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'غير مصرح — يرجى تسجيل الدخول' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'انتهت صلاحية الجلسة' });
  }
};

const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'ليس لديك صلاحية لهذا الإجراء' });
  }
  next();
};

const isStaff = (role) => ['superadmin', 'moderator'].includes(role);

const optionalVerifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return next();
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    /* public access without staff extras */
  }
  next();
};

module.exports = { verifyToken, optionalVerifyToken, requireRoles, isStaff };
