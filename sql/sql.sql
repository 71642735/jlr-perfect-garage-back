CREATE TABLE IF NOT EXISTS  black_list_access (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    token VARCHAR(255),
    reset_token VARCHAR(255),
    refresh_token VARCHAR(255),
    consents_token VARCHAR(255)
);

CREATE TABLE country_sfmc_configuration (
  area_code varchar(10) NOT NULL,
  sfmc_api_event_2fa varchar(255) DEFAULT NULL,
  sfmc_api_event_reset_password varchar(255) DEFAULT NULL,
  PRIMARY KEY (`area_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS login (
    id VARCHAR(255) PRIMARY KEY,    
    password VARCHAR(255),
    role VARCHAR(20),
    status VARCHAR(20),
    failed_login_attempts INT DEFAULT 0,
    reset_token VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE login
  ADD COLUMN twofa_code_hash VARBINARY(32) NULL,
  ADD COLUMN twofa_created_at DATETIME NULL,
  ADD COLUMN twofa_expires_at DATETIME NULL,
  ADD COLUMN twofa_used_at DATETIME NULL,
  ADD INDEX idx_twofa_active (twofa_expires_at, twofa_used_at);

ALTER TABLE login
  ADD COLUMN twofa_fail_count INT NOT NULL DEFAULT 0,
  ADD COLUMN twofa_first_fail_at DATETIME NULL,
  ADD COLUMN twofa_lock_until DATETIME NULL,
  ADD INDEX idx_twofa_lock (twofa_lock_until);

ALTER TABLE login
  ADD COLUMN last_twofa_send_at DATETIME NULL,      
  ADD COLUMN twofa_send_count INT NOT NULL DEFAULT 0,
  ADD COLUMN twofa_send_first_at DATETIME NULL,     
  ADD COLUMN twofa_send_lock_until DATETIME NULL, 
  ADD INDEX idx_twofa_send_lock (twofa_send_lock_until);

CREATE TABLE country_sfmc_configuration (
  area_code varchar(10) NOT NULL,
  sfmc_api_event_2fa varchar(255) DEFAULT NULL,
  sfmc_api_event_reset_password varchar(255) DEFAULT NULL,
  PRIMARY KEY (`area_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS retailer (
    id INT AUTO_INCREMENT PRIMARY KEY,   
    name VARCHAR(255),
    area_code VARCHAR(20),
    active boolean,
    FOREIGN KEY (area_code) REFERENCES country_sfmc_configuration(area_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS user (
    id VARCHAR(255) PRIMARY KEY,    
    name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    retailer_id INT,
    active BOOLEAN,
    FOREIGN KEY (retailer_id) REFERENCES retailer(id),
    FOREIGN KEY (id) REFERENCES login(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE user ADD COLUMN preferred_language VARCHAR(20);
ALTER TABLE login ADD COLUMN last_login TIMESTAMP default null;

