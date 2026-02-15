# RoomReserve

RoomReserve is a simple and efficient system for managing room reservations. This project consists of a frontend application built with modern web technologies and a backend powered by Go.

## Showcase

Here's a preview of RoomReserve in action:

### Home Dashboard
![Home Dashboard](./img/home.png)
The home dashboard provides an overview of all available rooms and their current status.

### Login Screen
![Login Screen](./img/login.png)
The login interface for user authentication.

## Requirements

* Node.js and npm installed for the frontend
* Go installed for the backend
* Oracle Database installed and configured
* SQL scripts `create_db.sql` and `insert_db.sql` for database setup
* Oracle Instant Client (for database connectivity)

## Installation and Usage

### Step 1: Environment Configuration

1. Create a `.env` file in the go directory:

```bash
DSN="oracle://YOUR_DATABASE_USERNAME:YOUR_DATABASE_PASSWORD@YOUR_DATABASE_IP:1521/database"
JWT_SECRET="L9hTcX3b7wG*5PxUv^&k0RqY#A8zD1%CmS2Fh@4VNlJqWjX"
```

### Step 2: Setup the Database

1. Ensure your Oracle Database instance is running.

2. Connect to Oracle using SQL*Plus:
```bash
sqlplus username/password@//hostname:port/service_name
```

3. Execute the database creation script:
```sql
@create_db.sql
```

4. Populate the database with initial data:
```sql
@insert_db.sql
```

### Step 3: Setup the Frontend (Terminal 1)

1. Navigate to the frontend directory:
```bash
cd booking\ app/
```

2. Install the required dependencies:
```bash
npm i
```

3. Start the development server:
```bash
npm run dev
```

### Step 4: Setup the Backend (Terminal 2)

1. Navigate to the backend directory:
```bash
cd go
```

2. Run the Go backend:
```bash
go run .
```

## Database Scripts

Here are the necessary Oracle SQL scripts for your database setup:

### create_db.sql:
```sql
-- Building
DROP TABLE building CASCADE CONSTRAINTS;
CREATE TABLE building
(
	id INT PRIMARY KEY,
	name VARCHAR2(30)
);

DROP TABLE floor CASCADE CONSTRAINTS;
CREATE TABLE floor
(
	id INT PRIMARY KEY,
	name VARCHAR2(30)
);

DROP TABLE building_floor CASCADE CONSTRAINTS;
CREATE TABLE building_floor 
(
	id INT PRIMARY KEY,
	building_id INT,
	floor_id INT,
	FOREIGN KEY (building_id) REFERENCES building(id) ON DELETE SET NULL,
	FOREIGN KEY (floor_id) REFERENCES floor(id) ON DELETE SET NULL
);

-- Role
DROP TABLE employee_role CASCADE CONSTRAINTS;
CREATE TABLE employee_role
(
	id INT PRIMARY KEY,
	name VARCHAR2(30)
);

DROP TABLE menu CASCADE CONSTRAINTS;
CREATE TABLE menu
(
	id INT PRIMARY KEY,
	name VARCHAR2(50)
);

DROP TABLE permission CASCADE CONSTRAINTS;
CREATE TABLE permission 
(
	employee_role_id INT,
	menu_id INT,
	FOREIGN KEY (employee_role_id) REFERENCES employee_role(id) ON DELETE SET NULL,
	FOREIGN KEY (menu_id) REFERENCES menu(id) ON DELETE SET NULL,
	PRIMARY KEY (employee_role_id, menu_id)
);

-- Department
DROP TABLE department CASCADE CONSTRAINTS;
CREATE TABLE department
(
	id INT PRIMARY KEY,
	name VARCHAR2(30)
);

-- Employee
DROP TABLE employee CASCADE CONSTRAINTS;
CREATE TABLE employee
(
	id INT PRIMARY KEY,
	name VARCHAR2(30),
	lname VARCHAR2(30),
	nlock NUMBER(1),
	sex VARCHAR2(10),
	email VARCHAR2(30),
	password VARCHAR2(255),
	dept_id INT,
	role_id INT,
	profile_pic VARCHAR2(100),
	FOREIGN KEY (dept_id) REFERENCES department(id) ON DELETE SET NULL,
	FOREIGN KEY (role_id) REFERENCES employee_role(id) ON DELETE SET NULL
);

-- Employee_Locked
DROP TABLE employee_locked CASCADE CONSTRAINTS;
CREATE TABLE employee_locked
(
	id INT PRIMARY KEY,
	date_locked DATE,
	employee_id INT,
	FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE SET NULL
);

-- Room
DROP TABLE room_type CASCADE CONSTRAINTS;
CREATE TABLE room_type
(
	id INT PRIMARY KEY,
	name VARCHAR2(30)
);

DROP TABLE room_status CASCADE CONSTRAINTS;
CREATE TABLE room_status
(
	id INT PRIMARY KEY,
	name VARCHAR2(30)
);

DROP TABLE room CASCADE CONSTRAINTS;
CREATE TABLE room
(
	id INT PRIMARY KEY,
	name VARCHAR2(30),
	description VARCHAR2(80),
	cap NUMBER(3),
	room_pic VARCHAR2(100),
	room_status_id INT,
	room_type_id INT,
	address_id INT,
	FOREIGN KEY (room_status_id) REFERENCES room_status(id) ON DELETE SET NULL,
	FOREIGN KEY (room_type_id) REFERENCES room_type(id) ON DELETE SET NULL,
	FOREIGN KEY (address_id) REFERENCES building_floor(id) ON DELETE SET NULL
);

-- Booking
DROP TABLE booking_status CASCADE CONSTRAINTS;
CREATE TABLE booking_status
(
	id INT PRIMARY KEY,
	name VARCHAR2(30)
);

DROP TABLE booking CASCADE CONSTRAINTS;
CREATE TABLE booking
(
	id INT PRIMARY KEY,
	booking_date DATE,
	start_time DATE,
	end_time DATE,
	qr VARCHAR2(100),
	request_message VARCHAR2(80),
	approved_id INT,
	status_id INT,
	room_id INT,
	emp_id INT,
	FOREIGN KEY (status_id) REFERENCES booking_status(id) ON DELETE SET NULL,
	FOREIGN KEY (room_id) REFERENCES room(id) ON DELETE SET NULL,
	FOREIGN KEY (emp_id) REFERENCES employee(id) ON DELETE SET NULL
);

-- Cancel List
DROP TABLE cancel CASCADE CONSTRAINTS;
CREATE TABLE cancel
(
	id INT PRIMARY KEY,
	reason VARCHAR2(80),
	booking_id INT,
	employee_id INT,
	FOREIGN KEY (booking_id) REFERENCES booking(id) ON DELETE SET NULL,
	FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE SET NULL
);
```

### insert_db.sql:
```sql
-- Inserting into building
INSERT INTO building (id, name) VALUES (1, 'Main Building');
INSERT INTO building (id, name) VALUES (2, 'Annex Building');

-- Inserting into floor
INSERT INTO floor (id, name) VALUES (1, 'Ground Floor');
INSERT INTO floor (id, name) VALUES (2, 'First Floor');

-- Inserting into building_floor
INSERT INTO building_floor (id, building_id, floor_id) VALUES (1, 1, 1);
INSERT INTO building_floor (id, building_id, floor_id) VALUES (2, 1, 2);
INSERT INTO building_floor (id, building_id, floor_id) VALUES (3, 2, 1);

-- Inserting into employee_role
INSERT INTO employee_role (id, name) VALUES (1, 'Manager');
INSERT INTO employee_role (id, name) VALUES (2, 'Staff');
INSERT INTO employee_role (id, name) VALUES (3, 'Assistant');
INSERT INTO employee_role (id, name) VALUES (4, 'Super');

-- Inserting into menu
INSERT INTO menu (id, name) VALUES (1, 'Lock Management');
INSERT INTO menu (id, name) VALUES (2, 'Report Management');
INSERT INTO menu (id, name) VALUES (3, 'Room Management');
INSERT INTO menu (id, name) VALUES (4, 'Role Management');
INSERT INTO menu (id, name) VALUES (5, 'Department Management');
INSERT INTO menu (id, name) VALUES (6, 'Employee Management');

-- Inserting into permission
INSERT INTO permission (employee_role_id, menu_id) VALUES (1, 1);
INSERT INTO permission (employee_role_id, menu_id) VALUES (1, 2);
INSERT INTO permission (employee_role_id, menu_id) VALUES (2, 2);
INSERT INTO permission (employee_role_id, menu_id) VALUES (4, 1);
INSERT INTO permission (employee_role_id, menu_id) VALUES (4, 2);
INSERT INTO permission (employee_role_id, menu_id) VALUES (4, 3);
INSERT INTO permission (employee_role_id, menu_id) VALUES (4, 4);
INSERT INTO permission (employee_role_id, menu_id) VALUES (4, 5);
INSERT INTO permission (employee_role_id, menu_id) VALUES (4, 6);

-- Inserting into department
INSERT INTO department (id, name) VALUES (1, 'HR');
INSERT INTO department (id, name) VALUES (2, 'IT');
INSERT INTO department (id, name) VALUES (3, 'Finance');

-- Inserting into employee
INSERT INTO employee (id, name, lname, nlock, sex, email, password, dept_id, role_id,profile_pic) 
VALUES (1, 'John', 'Doe', 0, 'Male', 'john.doe@example.com', 'securepassword', 1, 1,'ลุงไนท์.jpeg');

INSERT INTO employee (id, name, lname, nlock, sex, email, password, dept_id, role_id,profile_pic) 
VALUES (2, 'Ad', 'min', 0, 'Male', 'admin@admin', '1234', 1, 4,'ลุงไนท์.jpeg');

-- Inserting into employee_locked
INSERT INTO employee_locked (id, date_locked, employee_id) 
VALUES (1, SYSDATE, 1);
INSERT INTO employee_locked (id, date_locked, employee_id) 
VALUES (2, SYSDATE, 2);
INSERT INTO employee_locked (id, date_locked, employee_id) 
VALUES (3, SYSDATE, 1);

-- Inserting into room_type
INSERT INTO room_type (id, name) VALUES (1, 'Common Room');
INSERT INTO room_type (id, name) VALUES (2, 'VIP Room');

-- Inserting into room_status
INSERT INTO room_status (id, name) VALUES (1, 'ON');
INSERT INTO room_status (id, name) VALUES (2, 'OFF');

-- Inserting into room
INSERT INTO room (id, name, description, cap, room_status_id, room_type_id, address_id,room_pic) 
VALUES (1, 'Room A', 'Main conference room', 20, 1, 1, 1,'test2.jpeg');
INSERT INTO room (id, name, description, cap, room_status_id, room_type_id, address_id,room_pic) 
VALUES (2, 'Room B', 'Main conference room', 20, 1, 1, 1,'test2.jpeg');
INSERT INTO room (id, name, description, cap, room_status_id, room_type_id, address_id,room_pic) 
VALUES (3, 'VIP Room C', 'Main conference room projector', 20, 1, 2, 1,'room.png');
INSERT INTO room (id, name, description, cap, room_status_id, room_type_id, address_id,room_pic) 
VALUES (4, 'VIP Room C', 'ไทยทดสอบ', 20, 1, 2, 1,'room.png');

-- Inserting into booking_status
INSERT INTO booking_status (id, name) VALUES (1, 'Pending');
INSERT INTO booking_status (id, name) VALUES (2, 'Canceled');
INSERT INTO booking_status (id, name) VALUES (3, 'Expired');
INSERT INTO booking_status (id, name) VALUES (4, 'Completed');
INSERT INTO booking_status (id, name) VALUES (5, 'Waiting');
INSERT INTO booking_status (id, name) VALUES (6, 'Using');

-- Inserting into booking
INSERT INTO booking (id, booking_date, start_time, end_time, qr, request_message, approved_id, status_id, room_id, emp_id) 
VALUES (1, SYSDATE, TO_DATE('2024-10-01 09:00:00', 'YYYY-MM-DD HH24:MI:SS'), TO_DATE('2024-10-01 11:00:00', 'YYYY-MM-DD HH24:MI:SS'), NULL, 'Need projector', NULL, 1, 1, 2);
INSERT INTO booking (id, booking_date, start_time, end_time, qr, request_message, approved_id, status_id, room_id, emp_id) 
VALUES (2, SYSDATE, TO_DATE('2024-10-01 09:00:00', 'YYYY-MM-DD HH24:MI:SS'), TO_DATE('2024-10-01 11:00:00', 'YYYY-MM-DD HH24:MI:SS'), NULL, 'Need projector', NULL, 5, 1, 2);

-- Inserting into cancel
INSERT INTO cancel (id, reason, booking_id, employee_id) 
VALUES (1, 'Scheduling conflict', 1, 1);

-- Save
commit;
```

## Notes

* Ensure Oracle Instant Client is properly configured in your system PATH
* Update the `.env` file with your specific Oracle database credentials
* Make sure to grant appropriate permissions to your Oracle database user
* For security, never commit the `.env` file to version control
