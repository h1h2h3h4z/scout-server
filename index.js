const express = require('express');
const app = express();
const cors = require('cors');
const MembersRoute = require('./routes/MemberRoute');
const PORT = process.env.PORT || 5000;
const LeadersRoute = require('./routes/LeadersRoute');
const GroupsRoute = require('./routes/GroupsRoute');
const excelRoutes = require('./routes/excelRoutes')
const AuthRoutes = require('./routes/AuthRoutes')
const superAdminRoutes = require('./routes/AdminRoutes')
const addactivitycardRoutes = require('./routes/ActivityCardRotes') 
const contactRoutes = require('./routes/ContactRoutes');   
const dashboardRoutes = require('./routes/DashboardRoutes');
const portalRoutes = require('./routes/PortalRoutes');
const notificationRoutes = require('./routes/NotificationRoutes');
const announcementRoutes = require('./routes/AnnouncementRoutes');
const path = require('path'); 
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/members', MembersRoute);
app.use('/leaders', LeadersRoute);
app.use('/groups',GroupsRoute) ;
app.use('/exporttoexcel',excelRoutes)
app.use('/Auth',AuthRoutes);
app.use('/createadmin',superAdminRoutes);
app.use('/Activities',addactivitycardRoutes);
app.use('/contact', contactRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/portal', portalRoutes);
app.use('/notifications', notificationRoutes);
app.use('/announcements', announcementRoutes);
app.listen(PORT,()=>{
    console.log(`server is running on port ${PORT}`);
    
}) 