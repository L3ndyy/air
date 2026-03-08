-- Air Messenger — схема для MySQL 5
-- Выполнить один раз при первом деплое (например через phpMyAdmin или mysql CLI)

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  content TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  file_url VARCHAR(512) DEFAULT NULL,
  file_name VARCHAR(255) DEFAULT NULL,
  file_size INT DEFAULT NULL,
  edited_at DATETIME DEFAULT NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  reply_to_message_id INT DEFAULT NULL,
  reply_to_content VARCHAR(200) DEFAULT NULL,
  reply_to_sender_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sender_receiver (sender_id, receiver_id, created_at),
  KEY idx_receiver_sender (receiver_id, sender_id, created_at),
  KEY idx_created (created_at),
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
