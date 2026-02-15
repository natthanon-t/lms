package main

import "time"

type Building struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Floor struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type BuildingFloor struct {
	ID         int `json:"id"`
	BuildingID int `json:"building_id"`
	FloorID    int `json:"floor_id"`
}

type Address struct {
	ID           int    `json:"id"`
	BuildingName string `json:"building_name"`
	FloorName    string `json:"floor_name"`
}

type EmployeeRole struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Menu struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Permission struct {
	EmployeeRoleID int `json:"employee_role_id"`
	MenuID         int `json:"menu_id"`
}

type Department struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Employee struct {
	ID           int    `json:"id"`
	Name         string `json:"name"`
	LName        string `json:"lname"`
	Nlock        int    `json:"nlock"`
	Sex          string `json:"sex"`
	Email        string `json:"email"`
	Password     string `json:"password"`
	DeptID       int    `json:"dept_id"`
	RoleID       int    `json:"role_id"`
	ProfileImage []byte `json:"profile_image"`
}

type EmployeeLocked struct {
	ID         int    `json:"id"`
	DateLocked string `json:"date_locked"`
	EmployeeID int    `json:"employee_id"`
}
type EmployeeInfo struct {
	ID           int
	Name         string
	Lname        string
	DeptID       int
	RoleName     string
	DeptName     string
	Sex          string
	Email        string
	ProfileImage string `json:"profile_image"`
}
type RoomType struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}
type SearchAddress struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Floor    string `json:"floor"`
	Id_floor int    `json:"idfloor"`
}
type StatusType struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Room struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Status      int       `json:"status"`
	Cap         int       `json:"cap"`
	RoomTypeID  int       `json:"room_type_id"`
	AddressID   int       `json:"address_id"`
	DeletedAt   time.Time `json:"-"`
	Roompic     string    `json:"roompic"`
}

type BookingStatus struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Booking struct {
	ID             int    `json:"id"`
	BookingDate    string `json:"booking_date"`
	StartTime      string `json:"start_time"`
	EndTime        string `json:"end_time"`
	QR             []byte `json:"qr"`
	RequestMessage string `json:"request_message"`
	ApprovedID     int    `json:"approved_id"`
	StatusID       int    `json:"status_id"`
	RoomID         int    `json:"room_id"`
	EmpID          int    `json:"emp_id"`
}

type BookingCron struct {
	ID             int       `json:"id"`
	BookingDate    string    `json:"booking_date"`
	StartTime      time.Time `json:"start_time"`
	EndTime        time.Time `json:"end_time"`
	QR             []byte    `json:"qr"`
	RequestMessage string    `json:"request_message"`
	ApprovedID     int       `json:"approved_id"`
	StatusID       int       `json:"status_id"`
	RoomID         int       `json:"room_id"`
	EmpID          int       `json:"emp_id"`
}

type Roomformangage struct {
	ID           int       `json:"id"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	Status       int       `json:"status"`
	Cap          int       `json:"cap"`
	RoomTypeID   int       `json:"room_type_id"`
	AddressID    int       `json:"address_id"`
	DeletedAt    time.Time `json:"-"`
	FloorName    string    `json:"floor_name"`
	BuildingName string    `json:"building_name"`
	RoomTypeName string    `json:"room_type_name"`
	StatusName   string    `json:"status_name"`
	Roompic      string    `json:"roompic"`
}

type User struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Auth struct {
	Email     string    `json:"email"`
	ExpiredAt time.Time `json:"-"`
}

type reportUsed struct {
	Used   int `json:"used"`
	Unused int `json:"unused"`
}

type reportEmployeeLocked struct {
	EmployeeID    int    `json:"employee_id"`
	EmployeeName  string `json:"employee_name"`
	EmployeeNlock int    `json:"employee_nlock"`
	EmployeeImage string `json:"employee_image"`
}
