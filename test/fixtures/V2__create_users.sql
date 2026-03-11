CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email TEXT NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    created_at TIMESTAMP DEFAULT now()
);
