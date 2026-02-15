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