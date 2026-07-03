-- Last-Mile Delivery Tracker Database Schema


CREATE DATABASE IF NOT EXISTS lastmile_db;
USE lastmile_db;

-- Users table (customers, agents, admins)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role ENUM('customer', 'agent', 'admin') DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Zones table
CREATE TABLE IF NOT EXISTS zones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Areas table (areas belong to zones)
CREATE TABLE IF NOT EXISTS areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  zone_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  pincode VARCHAR(10),
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
);

-- Rate cards table 
CREATE TABLE IF NOT EXISTS rate_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_zone_id INT NOT NULL,
  to_zone_id INT NOT NULL,
  order_type ENUM('B2B', 'B2C') NOT NULL,
  rate_per_kg DECIMAL(10,2) NOT NULL,
  min_charge DECIMAL(10,2) DEFAULT 0,
  cod_surcharge DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_zone_id) REFERENCES zones(id),
  FOREIGN KEY (to_zone_id) REFERENCES zones(id)
);

-- Delivery agents table
CREATE TABLE IF NOT EXISTS delivery_agents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  zone_id INT,
  current_lat DECIMAL(10,8),
  current_lng DECIMAL(11,8),
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (zone_id) REFERENCES zones(id)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  agent_id INT,
  pickup_address TEXT NOT NULL,
  drop_address TEXT NOT NULL,
  pickup_zone_id INT,
  drop_zone_id INT,
  length DECIMAL(10,2) NOT NULL,
  breadth DECIMAL(10,2) NOT NULL,
  height DECIMAL(10,2) NOT NULL,
  actual_weight DECIMAL(10,2) NOT NULL,
  volumetric_weight DECIMAL(10,2),
  billed_weight DECIMAL(10,2),
  order_type ENUM('B2B', 'B2C') NOT NULL,
  payment_type ENUM('Prepaid', 'COD') NOT NULL,
  delivery_charge DECIMAL(10,2),
  cod_surcharge DECIMAL(10,2) DEFAULT 0,
  total_charge DECIMAL(10,2),
  status ENUM('Pending','Assigned','Picked Up','In Transit','Out for Delivery','Delivered','Failed') DEFAULT 'Pending',
  scheduled_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id),
  FOREIGN KEY (agent_id) REFERENCES delivery_agents(id),
  FOREIGN KEY (pickup_zone_id) REFERENCES zones(id),
  FOREIGN KEY (drop_zone_id) REFERENCES zones(id)
);

-- Order tracking history 
CREATE TABLE IF NOT EXISTS order_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  status VARCHAR(100) NOT NULL,
  updated_by INT,
  actor_role ENUM('customer','agent','admin') NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Reschedule requests
CREATE TABLE IF NOT EXISTS reschedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  new_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Default admin user (password: password)
INSERT IGNORE INTO users (name, email, password, role)
VALUES ('Admin', 'admin@lastmile.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
