import pool from "../config/db.js";

export const createNotification = async (req, res) => {
  try {
    const { utilisateurId, type, titre, message } = req.body;
    const [result] = await pool.execute(
      "INSERT INTO notifications (utilisateurId, type, titre, message, lu, informations_supplementaires, cree_a, mis_a_jour_a) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
      [utilisateurId, type, titre, message, false, req.body.informations_supplementaires]
    );
    res
      .status(201)
      .json({
        id: result.insertId,
        utilisateurId,
        type,
        titre,
        message,
        lu: false,
      });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getNotificationsForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await pool.execute(
      "SELECT * FROM notifications WHERE utilisateurId = ?",
      [userId]
    );
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const [notificationRows] = await pool.execute(
      "SELECT * FROM notifications WHERE id = ?",
      [id]
    );
    if (notificationRows.length === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }
    await pool.execute(
      "UPDATE notifications SET lu = ?, mis_a_jour_a = NOW() WHERE id = ?",
      [true, id]
    );
    const [updatedNotificationRows] = await pool.execute(
      "SELECT * FROM notifications WHERE id = ?",
      [id]
    );
    res.status(200).json(updatedNotificationRows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const [notificationRows] = await pool.execute(
      "SELECT id FROM notifications WHERE id = ?",
      [id]
    );
    if (notificationRows.length === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }
    await pool.execute("DELETE FROM notifications WHERE id = ?", [id]);
    res.status(204).send({ message: "Notification deleted succefully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
