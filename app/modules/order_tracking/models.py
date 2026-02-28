
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.sql import func

Base = declarative_base()


class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, autoincrement=True)
    role = Column(String(50), nullable=False, unique=True)
    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"
    email = Column(String(255), primary_key=True)
    password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    id_role = Column(Integer, ForeignKey("roles.id"), nullable=False)
    is_approved = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    createdAt = Column(DateTime, nullable=False, default=func.now())
    updatedAt = Column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )
    role = relationship("Role", back_populates="users")


class Complex(Base):
    __tablename__ = "complex"
    id = Column(Integer, primary_key=True, autoincrement=True)
    desc = Column(String(255), nullable=False)


class Ink(Base):
    __tablename__ = "ink"
    code_number = Column(String(50), primary_key=True)
    supplier = Column(String(255), nullable=False)
    color = Column(String(255), nullable=False)
    code = Column(String(50))
    pal_number = Column(String(50))
    date = Column(String(50))
    batch_palet_number = Column(String(50))
    is_finished = Column(Boolean, nullable=False, default=False)
    printings = relationship("Printing", back_populates="ink")


class Solvent(Base):
    __tablename__ = "solvent"
    code_number = Column(String(50), primary_key=True)
    supplier = Column(String(255), nullable=False)
    product = Column(String(255), nullable=False)
    code = Column(String(50), nullable=False)
    pal_number = Column(String(50))
    date = Column(String(50), nullable=False)
    batch_palet_number = Column(String(50))
    is_finished = Column(Boolean, nullable=False, default=False)


class Cutting(Base):
    __tablename__ = "cutting"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_number = Column(String(50), nullable=False, index=True)
    batch_number = Column(String(50), nullable=False, index=True)
    machine = Column(String(100), nullable=False)
    customer_name = Column(String(255), nullable=False)
    operator_name = Column(String(255), nullable=False)
    zipper_number = Column(String(50))
    slider_number = Column(String(50))
    date = Column(String(50), nullable=False)
    speed = Column(Float)
    uom = Column(String(20))
    quantity = Column(Float)
    waste = Column(Float)
    notes = Column(Text)
    createdAt = Column(DateTime, nullable=False, default=func.now())
    updatedAt = Column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )


class Lamination(Base):
    __tablename__ = "lamination"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_number = Column(String(50), nullable=False, index=True)
    batch_number = Column(String(50), nullable=False, index=True)
    machine = Column(String(100), nullable=False)
    customer_name = Column(String(255), nullable=False)
    operator_name = Column(String(255), nullable=False)
    glue_number = Column(String(50))
    hardner_number = Column(String(50))
    date = Column(String(50), nullable=False)
    complex = Column(String(255))
    glue_speed = Column(Float)
    machine_speed = Column(Float)
    meters = Column(Float)
    weight = Column(Float)
    waste = Column(Float)
    glue_weight = Column(Float)
    hardner_weight = Column(Float)
    createdAt = Column(DateTime, nullable=False, default=func.now())
    updatedAt = Column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )


class Printing(Base):
    __tablename__ = "printing"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_number = Column(String(50), nullable=False, index=True)
    batch_number = Column(String(50), nullable=False, index=True)
    machine = Column(String(100), nullable=False)
    customer_name = Column(String(255), nullable=False)
    operator_name = Column(String(255), nullable=False)
    ink_1 = Column(String(50), ForeignKey("ink.code_number"), nullable=True)
    ink_2 = Column(String(50), ForeignKey("ink.code_number"), nullable=True)
    ink_3 = Column(String(50), ForeignKey("ink.code_number"), nullable=True)
    ink_4 = Column(String(50), ForeignKey("ink.code_number"), nullable=True)
    ink_5 = Column(String(50), ForeignKey("ink.code_number"), nullable=True)
    ink_6 = Column(String(50), ForeignKey("ink.code_number"), nullable=True)
    ink_7 = Column(String(50), ForeignKey("ink.code_number"), nullable=True)
    ink_8 = Column(String(50), ForeignKey("ink.code_number"), nullable=True)
    solvent_1 = Column(String(50), ForeignKey("solvent.code_number"), nullable=True)
    solvent_2 = Column(String(50), ForeignKey("solvent.code_number"), nullable=True)
    solvent_3 = Column(String(50), ForeignKey("solvent.code_number"), nullable=True)
    date = Column(String(50), nullable=False)
    complex = Column(String(255))
    speed = Column(Float)
    width = Column(Float)
    printed_meters = Column(Float)
    weight = Column(Float)
    waste = Column(Float)
    number_of_colors = Column(Integer)
    hours = Column(Float)
    notes = Column(Text)
    createdAt = Column(DateTime, nullable=False, default=func.now())
    updatedAt = Column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )

    ink = relationship("Ink", foreign_keys=[ink_1])


class WarehouseToDispatch(Base):
    __tablename__ = "warehouse_to_dispatch"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_number = Column(String(50), nullable=False, index=True)
    batch_number = Column(String(50), nullable=False, index=True)
    supplier_name = Column(String(255), nullable=False)
    item_description = Column(String(255), nullable=False)
    name_received = Column(String(255), nullable=False)
    quantity_requested = Column(Float, nullable=False)
    quantity_sent = Column(Float, nullable=False)
    notes = Column(Text)
    date = Column(String(50), nullable=False)
    createdAt = Column(DateTime, nullable=False, default=func.now())
    updatedAt = Column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )


class DispatchToProduction(Base):
    __tablename__ = "dispatch_to_production"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_number = Column(String(50), nullable=False, index=True)
    date = Column(String(50), nullable=False)
    item_description = Column(String(255), nullable=False)
    uom = Column(String(20), nullable=False)
    quantity_requested = Column(Float, nullable=False)
    quantity_sent = Column(Float, nullable=False)
    batch_number = Column(String(50), nullable=False, index=True)
    name_received = Column(String(255), nullable=False)
    quantity_returned = Column(Float)
    createdAt = Column(DateTime, nullable=False, default=func.now())
    updatedAt = Column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )


class Extruder(Base):
    __tablename__ = "extruder"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_number = Column(String(50), nullable=False, index=True)
    date = Column(String(50), nullable=False)
    operator = Column(String(255), nullable=False)
    client = Column(String(255), nullable=False)
    color = Column(String(50), nullable=False)
    size = Column(String(50), nullable=False)
    thickness = Column(Float, nullable=False)
    item_description = Column(String(255), nullable=False)
    meters = Column(Float, nullable=False)
    weight = Column(Float, nullable=False)
    ldpe_batch_number = Column(String(50))
    enable_batch_number = Column(String(50))
    exact_batch_number = Column(String(50))
    white_batch_number = Column(String(50))
    createdAt = Column(DateTime, nullable=False, default=func.now())
    updatedAt = Column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )


class RawSlitting(Base):
    __tablename__ = "raw_slitting"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_number = Column(String(50), nullable=False, index=True)
    date = Column(String(50), nullable=False)
    batch_number = Column(String(50), nullable=False, index=True)
    operator = Column(String(255), nullable=False)
    client = Column(String(255), nullable=False)
    complex = Column(String(255))
    supplier = Column(String(255), nullable=False)
    roll_width = Column(Float, nullable=False)
    meters = Column(Float, nullable=False)
    weight = Column(Float, nullable=False)
    size_after_slitting = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)
    purpose = Column(String(255))
    remaining_destination = Column(String(255))
    waste = Column(Float)
    createdAt = Column(DateTime, nullable=False, default=func.now())
    updatedAt = Column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )


class PVC(Base):
    __tablename__ = "pvc"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_number = Column(String(50), nullable=False, index=True)
    batch_number = Column(String(50), nullable=False, index=True)
    machine = Column(String(100), nullable=False)
    customer_name = Column(String(255), nullable=False)
    operator_name = Column(String(255), nullable=False)
    glue_number = Column(String(50))
    notes = Column(Text)
    date = Column(String(50), nullable=False)
    createdAt = Column(DateTime, nullable=False, default=func.now())
    updatedAt = Column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )


class Slitting(Base):
    __tablename__ = "slitting"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_number = Column(String(50), nullable=False, index=True)
    batch_number = Column(String(50), nullable=False, index=True)
    machine = Column(String(100), nullable=False)
    customer_name = Column(String(255), nullable=False)
    operator_name = Column(String(255), nullable=False)
    date = Column(String(50), nullable=False)
    barcode = Column(String(100))
    production = Column(Float)
    waste = Column(Float)
    notes = Column(Text)
    createdAt = Column(DateTime, nullable=False, default=func.now())
    updatedAt = Column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )


class ActivityLog(Base):
    __tablename__ = "activity_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_email = Column(String(255), nullable=False, index=True)
    action = Column(String(50), nullable=False, index=True)
    table_name = Column(String(50), nullable=False)
    record_id = Column(String(50), nullable=False)
    details = Column(Text)
    timestamp = Column(DateTime, nullable=False, default=func.now(), index=True)


class AdminSettings(Base):
    __tablename__ = "admin_settings"
    id = Column(Integer, primary_key=True, autoincrement=True)
    setting_key = Column(String(100), nullable=False, unique=True, index=True)
    setting_value = Column(Text)
    setting_description = Column(String(255))
    last_updated_by = Column(String(255), nullable=False)
    updated_at = Column(DateTime, nullable=False, default=func.now())
