const ExcelJS = require("exceljs");
const db = require("../db");
const path = require("path");
const fs = require("fs");

const exportexcel = async (req, res) => {
  const id = req.params.id;

  if (!id || isNaN(id)) {
    return res.status(400).send("معرف المجموعة غير صالح");
  }

  try {
    const [groupRows] = await db.promise().query(
      "SELECT id, name, leader_id FROM Groups WHERE id = ?",
      [id]
    );

    if (groupRows.length === 0) {
      return res.status(404).send("المجموعة غير موجودة");
    }

    const group = groupRows[0];

    const [leaderRows] = await db.promise().query(
      "SELECT id, name, email, phone FROM leaders WHERE id = ?",
      [group.leader_id]
    );
    const leader = leaderRows[0] || { name: "غير محدد", email: "", phone: "" };

    const [members] = await db.promise().query(
      `SELECT name, phone, birthdate, createdAt FROM Members WHERE group_id = ? ORDER BY name ASC`,
      [id]
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "نظام كشاف";
    workbook.lastModifiedBy = "نظام كشاف";
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet("أعضاء الفرقة", {
      properties: { tabColor: { argb: 'FF2F75B5' }, defaultRowHeight: 25 },
      pageSetup: { orientation: 'landscape', margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4 } }
    });

    const styles = {
      headerFill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F75B5' } },
      accentFill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } },
      lightFill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F3F3' } },
      border: {
        top: { style: 'thin', color: { argb: 'FF4F81BD' } },
        left: { style: 'thin', color: { argb: 'FF4F81BD' } },
        bottom: { style: 'thin', color: { argb: 'FF4F81BD' } },
        right: { style: 'thin', color: { argb: 'FF4F81BD' } }
      },
      titleFont: { name: 'Arial', size: 18, bold: true, color: { argb: 'FFFFFFFF' } },
      subtitleFont: { name: 'Arial', size: 14, italic: true, color: { argb: 'FFFFFFFF' } },
      headerFont: { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } },
      dataFont: { name: 'Arial', size: 11, color: { argb: 'FF000000' } },
      warningStyle: {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } },
        font: { bold: true, color: { argb: 'FF990000' } }
      }
    };

    const logoPath = path.join(__dirname, './risala.jpg');
    if (fs.existsSync(logoPath)) {
      const imageId = workbook.addImage({ filename: logoPath, extension: 'jpeg' });
      worksheet.addImage(imageId, {
        tl: { col: 5.5, row: 0.2 },
        ext: { width: 100, height: 100 }
      });
    }

    const titleData = [
      `اسم الفرقة: ${group.name}`,
      `اسم القائد: ${leader.name}`,
      `تاريخ التصدير: ${new Date().toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`
    ];

    titleData.forEach((text, index) => {
      worksheet.mergeCells(`A${index + 1}:E${index + 1}`);
      const row = worksheet.getRow(index + 1);
      const cell = row.getCell(1);
      row.height = 25;
      cell.value = text;
      cell.font = index === 0 ? styles.titleFont : styles.subtitleFont;
      cell.fill = styles.headerFill;
      cell.border = styles.border;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    worksheet.addRow([]);

    worksheet.columns = [
      { header: 'الاسم', key: 'name', width: 30 },
      { header: 'رقم الهاتف', key: 'phone', width: 20 },
      { header: 'تاريخ الميلاد', key: 'birthdate', width: 20 },
      { header: 'العمر', key: 'age', width: 10 },
      { header: 'تاريخ التسجيل', key: 'createdAt', width: 20 }
    ];

    worksheet.views = [{ state: 'frozen', ySplit: 5 }];

    const headerRow = worksheet.getRow(5);
    headerRow.values = worksheet.columns.map(c => c.header);
    headerRow.height = 28;
    headerRow.eachCell(cell => {
      cell.font = { ...styles.headerFont, size: 13 };
      cell.fill = {
        type: 'gradient',
        gradient: 'angle',
        degree: 0,
        stops: [
          { position: 0, color: { argb: 'FF2F75B5' } },
          { position: 1, color: { argb: 'FF4F81BD' } }
        ]
      };
      cell.border = styles.border;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });

    const currentYear = new Date().getFullYear();

    members.forEach((member, index) => {
      const birthDate = member.birthdate ? new Date(member.birthdate) : null;
      const age = birthDate ? currentYear - birthDate.getFullYear() : '';

      const row = worksheet.addRow({
        name: member.name,
        phone: member.phone || '',
        birthdate: birthDate,
        age: age,
        createdAt: new Date(member.createdAt)
      });

      if (age < 18) {
        row.getCell('D').style = styles.warningStyle;
      }

      if (member.phone) {
        row.getCell('B').value = {
          text: member.phone,
          hyperlink: `tel:${member.phone}`
        };
        row.getCell('B').numFmt = '0000-000-0000';
      }

      row.getCell('C').numFmt = 'dd/mm/yyyy';
      row.getCell('E').numFmt = 'dd/mm/yyyy';

      row.fill = index % 2 === 0
        ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F1FA' } }
        : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

      row.eachCell(cell => {
        cell.font = styles.dataFont;
        cell.border = styles.border;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    const footerRow = worksheet.addRow([]);
    worksheet.mergeCells(`A${footerRow.number}:E${footerRow.number}`);
    footerRow.getCell(1).value = `إجمالي الأعضاء: ${members.length} | تم التصدير بواسطة نظام كشاف`;
    footerRow.getCell(1).font = { ...styles.dataFont, italic: true, color: { argb: 'FF555555' } };
    footerRow.getCell(1).alignment = { horizontal: 'center' };

    const exportDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

    const fileName = `أعضاء_الفرقة_${group.name.replace(/\s+/g, '_')}.xlsx`;
    const filePath = path.join(exportDir, fileName);

    // ✅ استبدال الملف إذا كان موجودًا
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await workbook.xlsx.writeFile(filePath);
    res.download(filePath, fileName);

  } catch (err) {
    console.error('Export error:', err);
    res.status(500).send("حدث خطأ أثناء تصدير البيانات. يرجى المحاولة لاحقًا");
  }
};

const exportAllGroupsExcel = async (req, res) => {
  try {
    const [groups] = await db.promise().query("SELECT id, name, leader_id FROM Groups");

    if (groups.length === 0) {
      return res.status(404).send("لا توجد فرق لعرضها");
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "نظام كشاف";
    workbook.created = new Date();
    workbook.modified = new Date();

    const styles = {
      headerFill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF34495E' } },
      rowFill1: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECF0F1' } },
      rowFill2: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
      titleFill: { type: 'gradient', gradient: 'angle', degree: 0, stops: [
        { position: 0, color: { argb: 'FF2980B9' } },
        { position: 1, color: { argb: 'FF6DD5FA' } }
      ] },
      border: {
        top: { style: 'thin', color: { argb: 'FFBDC3C7' } },
        left: { style: 'thin', color: { argb: 'FFBDC3C7' } },
        bottom: { style: 'thin', color: { argb: 'FFBDC3C7' } },
        right: { style: 'thin', color: { argb: 'FFBDC3C7' } },
      },
      headerFont: { name: 'Cairo', size: 13, bold: true, color: { argb: 'FFFFFFFF' } },
      dataFont: { name: 'Cairo', size: 12, color: { argb: 'FF2C3E50' } },
      titleFont: { name: 'Cairo', size: 16, bold: true, color: { argb: 'FFFFFFFF' } },
      subFont: { name: 'Cairo', size: 12, italic: true, color: { argb: 'FF34495E' } },
    };

    for (const group of groups) {
      const [leaderRows] = await db.promise().query("SELECT name FROM leaders WHERE id = ?", [group.leader_id]);
      const leader = leaderRows[0] || { name: "غير معروف" };

      const [members] = await db.promise().query(
        "SELECT name, phone, birthdate, createdAt FROM Members WHERE group_id = ? ORDER BY name ASC",
        [group.id]
      );

      const worksheet = workbook.addWorksheet(group.name.substring(0, 31), {
        properties: { tabColor: { argb: 'FF1ABC9C' } },
        pageSetup: { orientation: 'landscape' }
      });

      worksheet.mergeCells('A1:E1');
      worksheet.getCell('A1').value = `فرقة: ${group.name}`;
      worksheet.getCell('A1').font = styles.titleFont;
      worksheet.getCell('A1').fill = styles.titleFill;
      worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.mergeCells('A2:E2');
      worksheet.getCell('A2').value = `القائد: ${leader.name}`;
      worksheet.getCell('A2').font = styles.subFont;
      worksheet.getCell('A2').alignment = { horizontal: 'center' };

      worksheet.mergeCells('A3:E3');
      worksheet.getCell('A3').value = `عدد الأعضاء: ${members.length}`;
      worksheet.getCell('A3').font = styles.subFont;
      worksheet.getCell('A3').alignment = { horizontal: 'center' };

      worksheet.addRow([]);
      const headerRow = worksheet.addRow(['الاسم', 'رقم الهاتف', 'تاريخ الميلاد', 'العمر', 'تاريخ التسجيل']);
      headerRow.eachCell(cell => {
        cell.fill = styles.headerFill;
        cell.font = styles.headerFont;
        cell.border = styles.border;
        cell.alignment = { horizontal: 'center' };
      });

      const currentYear = new Date().getFullYear();
      members.forEach((member, index) => {
        const birth = new Date(member.birthdate);
        const age = currentYear - birth.getFullYear();
        const row = worksheet.addRow([
          member.name,
          member.phone,
          birth,
          age,
          new Date(member.createdAt)
        ]);

        row.eachCell(cell => {
          cell.font = styles.dataFont;
          cell.border = styles.border;
          cell.alignment = { horizontal: 'center' };
        });

        row.fill = index % 2 === 0 ? styles.rowFill1 : styles.rowFill2;
        row.getCell(3).numFmt = 'dd/mm/yyyy';
        row.getCell(5).numFmt = 'dd/mm/yyyy';
      });

      worksheet.columns.forEach(col => col.width = 22);
    }

    const exportDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

    const fileName = `تقرير_كل_الفرق.xlsx`;
    const filePath = path.join(exportDir, fileName);

    // ✅ استبدال الملف إذا كان موجودًا
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await workbook.xlsx.writeFile(filePath);
    res.download(filePath, fileName);

  } catch (err) {
    console.error(err);
    res.status(500).send("حدث خطأ أثناء التصدير");
  }
};

module.exports = { exportexcel, exportAllGroupsExcel };
