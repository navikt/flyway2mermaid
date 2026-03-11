CREATE TABLE IF NOT EXISTS avklaringkode (
    kode TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS behandling (
    behandling_id uuid PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'opprettet'
);

CREATE TABLE IF NOT EXISTS avklaring
(
    id             uuid PRIMARY KEY,
    avklaring_kode TEXT NOT NULL REFERENCES avklaringkode (kode),
    behandling_id  uuid NOT NULL REFERENCES behandling (behandling_id),
    opprettet      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (behandling_id, avklaring_kode)
);
