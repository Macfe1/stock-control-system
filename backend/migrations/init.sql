# Crear un archivo init.sql con el contenido completo de la migración SQL de Mafe

sql_content = """
-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Función global para actualizar el campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---------------------------------------------------------
-- Tabla: warehouses
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE,
    name TEXT,
    address TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_warehouses_updated_at
BEFORE UPDATE ON warehouses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

---------------------------------------------------------
-- Tabla: products
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE,
    name TEXT,
    description TEXT,
    unit TEXT,
    price NUMERIC,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products
    ADD CONSTRAINT products_price_non_negative CHECK (price >= 0::numeric);

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

---------------------------------------------------------
-- Tabla: users
---------------------------------------------------------
CREATE TYPE user_role AS ENUM ('ADMIN', 'OPERATOR'); -- Ajusta según tus roles

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    password_hash TEXT,
    role user_role,
    active BOOLEAN DEFAULT TRUE,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

---------------------------------------------------------
-- Tabla: inventory
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory (
    product_id UUID,
    warehouse_id UUID,
    quantity NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (product_id, warehouse_id),
    CONSTRAINT inventory_quantity_non_negative CHECK (quantity >= 0::numeric),
    FOREIGN KEY (product_id) REFERENCES products (id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses (id)
);

---------------------------------------------------------
-- Tabla: stock_movements
---------------------------------------------------------

-- Enum para tipo de movimiento
CREATE TYPE stock_movement_type AS ENUM ('INBOUND', 'OUTBOUND', 'TRANSFER', 'ADJUSTMENT');

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID,
    warehouse_origin_id UUID,
    warehouse_destination_id UUID,
    user_id UUID,
    type stock_movement_type,
    quantity INTEGER,
    reason TEXT,
    active BOOLEAN DEFAULT TRUE,
    external_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    FOREIGN KEY (product_id) REFERENCES products (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (warehouse_origin_id) REFERENCES warehouses (id),
    FOREIGN KEY (warehouse_destination_id) REFERENCES warehouses (id)
);

-- Constraints de negocio
ALTER TABLE stock_movements ADD CONSTRAINT sm_adjust_reason
CHECK (type <> 'ADJUSTMENT'::stock_movement_type OR (reason IS NOT NULL AND length(reason) > 0));

ALTER TABLE stock_movements ADD CONSTRAINT sm_transfer_rule
CHECK (type <> 'TRANSFER'::stock_movement_type OR warehouse_origin_id IS NOT NULL);

ALTER TABLE stock_movements ADD CONSTRAINT sm_outbound_rule
CHECK (type <> 'OUTBOUND'::stock_movement_type OR warehouse_origin_id IS NOT NULL);

ALTER TABLE stock_movements ADD CONSTRAINT sm_inbound_rule
CHECK (type <> 'INBOUND'::stock_movement_type OR warehouse_destination_id IS NOT NULL);

ALTER TABLE stock_movements ADD CONSTRAINT movements_quantity_non_negative
CHECK (quantity >= 0);

-- Triggers
CREATE TRIGGER update_stock_movements_updated_at
BEFORE UPDATE ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Nota: Asegúrate de definir esta función en tu entorno si decides descomentar el trigger
-- CREATE TRIGGER trigger_update_inventory
-- AFTER INSERT ON stock_movements
-- FOR EACH ROW
-- EXECUTE FUNCTION update_inventory_on_stock_movement();
"""

from pathlib import Path

file_path = Path("/mnt/data/init.sql")
file_path.write_text(sql_content)

file_path.name
