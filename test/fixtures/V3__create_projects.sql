CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    owner_id INTEGER NOT NULL REFERENCES users(id)
);

CREATE TABLE project_members (
    project_id INTEGER NOT NULL REFERENCES projects(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member',
    PRIMARY KEY (project_id, user_id)
);
