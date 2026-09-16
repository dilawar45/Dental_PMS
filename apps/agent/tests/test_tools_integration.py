"""Integration tests for real tool implementations against the live database."""

from datetime import datetime, timedelta
import pytest
import pytest_asyncio
import asyncpg

from app.db.client import get_pool, with_clinic
from app.agent.registry import dispatch_tool

CLINIC_A_ID = "00000000-0000-4000-a000-00000000000a"
CLINIC_B_ID = "00000000-0000-4000-b000-00000000000b"
DENTIST_A_ID = "00000000-0000-4000-a000-000000000001"


async def _cleanup(conn: asyncpg.Connection) -> None:
    """Clean all test data in a single batched round-trip."""
    await conn.execute(
        f"""
        DELETE FROM dev_outbox WHERE body LIKE '%REC-TEST-01.pdf%' OR body LIKE '%Test message%';
        DELETE FROM audit_log WHERE clinic_id IN ('{CLINIC_A_ID}', '{CLINIC_B_ID}');
        DELETE FROM handoffs WHERE clinic_id IN ('{CLINIC_A_ID}', '{CLINIC_B_ID}');
        DELETE FROM messages WHERE clinic_id IN ('{CLINIC_A_ID}', '{CLINIC_B_ID}');
        DELETE FROM conversations WHERE clinic_id IN ('{CLINIC_A_ID}', '{CLINIC_B_ID}');
        DELETE FROM receipts WHERE clinic_id IN ('{CLINIC_A_ID}', '{CLINIC_B_ID}');
        DELETE FROM invoices WHERE clinic_id IN ('{CLINIC_A_ID}', '{CLINIC_B_ID}');
        DELETE FROM booking_requests WHERE clinic_id IN ('{CLINIC_A_ID}', '{CLINIC_B_ID}');
        DELETE FROM appointments WHERE clinic_id IN ('{CLINIC_A_ID}', '{CLINIC_B_ID}');
        DELETE FROM consents WHERE clinic_id IN ('{CLINIC_A_ID}', '{CLINIC_B_ID}');
        DELETE FROM patients WHERE clinic_id IN ('{CLINIC_A_ID}', '{CLINIC_B_ID}');
        DELETE FROM users WHERE clinic_id IN ('{CLINIC_A_ID}', '{CLINIC_B_ID}');
        DELETE FROM clinics WHERE id IN ('{CLINIC_A_ID}', '{CLINIC_B_ID}');
        """
    )


async def _setup(conn: asyncpg.Connection) -> None:
    """Seed test clinics and practitioner."""
    await conn.execute(
        """
        INSERT INTO clinics (id, name, slug, address, phone, timezone, locale)
        VALUES
          ($1::uuid, 'Test Clinic Alpha', 'test-clinic-alpha', '100 Alpha Way, Lahore', '+923001111111', 'Asia/Karachi', 'en-PK'),
          ($2::uuid, 'Test Clinic Beta', 'test-clinic-beta', '200 Beta Road, Karachi', '+923002222222', 'Asia/Karachi', 'en-PK')
        ON CONFLICT (id) DO NOTHING
        """,
        CLINIC_A_ID,
        CLINIC_B_ID,
    )

    await conn.execute(
        """
        INSERT INTO users (id, clinic_id, email, full_name, role)
        VALUES ($1::uuid, $2::uuid, 'dentist.alpha@test.com', 'Dr. Alpha Practitioner', 'dentist')
        ON CONFLICT (id) DO NOTHING
        """,
        DENTIST_A_ID,
        CLINIC_A_ID,
    )


@pytest_asyncio.fixture(scope="function", autouse=True)
async def init_test_db():
    """Setup test data before each test and cleanup afterwards."""
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await _cleanup(conn)
            await _setup(conn)
    except Exception as exc:
        pytest.skip(f"Live database not reachable, skipping integration test: {exc}")
    yield
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await _cleanup(conn)
    except Exception:
        pass


@pytest.mark.asyncio
async def test_real_create_patient_and_audit():
    """Test create_patient inserts patient, consent snapshot, and audit log."""
    context = {"clinic_id": CLINIC_A_ID}
    res = await dispatch_tool(
        name="create_patient",
        arguments={
            "full_name": "Tariq Jamil",
            "phone": "+923009990001",
            "consent_type": "data_processing",
            "email": "tariq@test.com",
            "dob": "1992-06-15",
            "gender": "male",
        },
        context=context,
    )
    assert res.patient_id is not None
    assert res.full_name == "Tariq Jamil"
    assert res.status == "created"

    # Verify patient in DB
    async def _verify(conn: asyncpg.Connection):
        p_row = await conn.fetchrow(
            "SELECT full_name, phone, email, dob FROM patients WHERE id = $1::uuid",
            res.patient_id,
        )
        assert p_row is not None
        assert p_row["full_name"] == "Tariq Jamil"

        # Verify consent
        c_row = await conn.fetchrow(
            "SELECT type, version, text_snapshot FROM consents WHERE patient_id = $1::uuid",
            res.patient_id,
        )
        assert c_row is not None
        assert c_row["version"] == "1.0.0"
        assert "رضامندی" in c_row["text_snapshot"]

        # Verify audit log
        a_row = await conn.fetchrow(
            "SELECT action, entity, entity_id FROM audit_log WHERE entity_id = $1::uuid",
            res.patient_id,
        )
        assert a_row is not None
        assert a_row["action"] == "patient.create"
        assert a_row["entity"] == "patient"

    await with_clinic(CLINIC_A_ID, _verify)


@pytest.mark.asyncio
async def test_real_lookup_patient():
    """Test lookup_patient finds existing patient and returns None for unknown."""
    context = {"clinic_id": CLINIC_A_ID}

    # Pre-create patient
    await dispatch_tool(
        name="create_patient",
        arguments={
            "full_name": "Tariq Jamil",
            "phone": "+923009990001",
            "consent_type": "data_processing",
            "email": "tariq@test.com",
        },
        context=context,
    )

    # 1. Existing patient
    found_res = await dispatch_tool(
        name="lookup_patient",
        arguments={"phone": "+923009990001"},
        context=context,
    )
    assert found_res.found is True
    assert found_res.patient is not None
    assert found_res.patient.full_name == "Tariq Jamil"
    assert found_res.patient.email == "tariq@test.com"

    # 2. Unknown patient
    unknown_res = await dispatch_tool(
        name="lookup_patient",
        arguments={"phone": "+923990000000"},
        context=context,
    )
    assert unknown_res.found is False
    assert unknown_res.patient is None


@pytest.mark.asyncio
async def test_real_get_clinic_info():
    """Test get_clinic_info retrieves clinic details and formatting."""
    context = {"clinic_id": CLINIC_A_ID}

    hours_res = await dispatch_tool(
        name="get_clinic_info",
        arguments={"topic": "hours"},
        context=context,
    )
    assert "Monday through Saturday" in hours_res.info

    location_res = await dispatch_tool(
        name="get_clinic_info",
        arguments={"topic": "location"},
        context=context,
    )
    assert "100 Alpha Way" in location_res.info

    pricing_res = await dispatch_tool(
        name="get_clinic_info",
        arguments={"topic": "pricing"},
        context=context,
    )
    assert "PKR 1,500" in pricing_res.info


@pytest.mark.asyncio
async def test_real_check_availability():
    """Test check_availability calculates 30-min intervals and excludes booked slots."""
    context = {"clinic_id": CLINIC_A_ID}
    target_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")

    # 1. Check initial availability
    res1 = await dispatch_tool(
        name="check_availability",
        arguments={"date": target_date, "dentist_id": DENTIST_A_ID},
        context=context,
    )
    assert len(res1.available_slots) > 0
    slot_count_before = len(res1.available_slots)

    # 2. Book an appointment from 10:00 to 10:30 PK time
    appt_start = datetime.fromisoformat(f"{target_date}T10:00:00+05:00")
    appt_end = datetime.fromisoformat(f"{target_date}T10:30:00+05:00")

    # Create patient to attach appointment
    p_res = await dispatch_tool(
        name="create_patient",
        arguments={"full_name": "Booking Patient", "phone": "+923008880001"},
        context=context,
    )

    async def _book(conn: asyncpg.Connection):
        await conn.execute(
            """
            INSERT INTO appointments (
                clinic_id, patient_id, dentist_id, start_at, end_at, status, reason
            ) VALUES (
                $1::uuid, $2::uuid, $3::uuid, $4, $5, 'scheduled', 'Test Booking'
            )
            """,
            CLINIC_A_ID,
            p_res.patient_id,
            DENTIST_A_ID,
            appt_start,
            appt_end,
        )

    await with_clinic(CLINIC_A_ID, _book)

    # 3. Check availability again: overlapping slot must be excluded
    res2 = await dispatch_tool(
        name="check_availability",
        arguments={"date": target_date, "dentist_id": DENTIST_A_ID},
        context=context,
    )
    assert len(res2.available_slots) == slot_count_before - 1
    assert not any(s.start_at.startswith(f"{target_date}T10:00:00") for s in res2.available_slots)


@pytest.mark.asyncio
async def test_real_create_booking_request_and_audit():
    """Test create_booking_request queues pending request and writes audit log."""
    context = {"clinic_id": CLINIC_A_ID}
    slot_start = "2026-10-01T14:00:00+05:00"
    slot_end = "2026-10-01T14:30:00+05:00"

    res = await dispatch_tool(
        name="create_booking_request",
        arguments={
            "slot_start": slot_start,
            "slot_end": slot_end,
            "channel": "whatsapp",
            "patient_name": "Amina Sheikh",
            "patient_phone": "+923009990002",
            "reason": "Teeth cleaning",
        },
        context=context,
    )
    assert res.booking_request_id is not None
    assert res.status == "pending"

    # Verify audit log and DB row
    async def _verify(conn: asyncpg.Connection):
        b_row = await conn.fetchrow(
            "SELECT status, patient_name, requested_via FROM booking_requests WHERE id = $1::uuid",
            res.booking_request_id,
        )
        assert b_row is not None
        assert b_row["status"] == "pending"
        assert b_row["patient_name"] == "Amina Sheikh"
        assert b_row["requested_via"] == "whatsapp"

        a_row = await conn.fetchrow(
            "SELECT action, entity, entity_id FROM audit_log WHERE entity_id = $1::uuid",
            res.booking_request_id,
        )
        assert a_row is not None
        assert a_row["action"] == "booking_request.create"

    await with_clinic(CLINIC_A_ID, _verify)


@pytest.mark.asyncio
async def test_create_booking_request_rejects_cross_clinic_patient():
    """Booking request with foreign patient_id is rejected."""
    context = {"clinic_id": CLINIC_A_ID}
    foreign_patient_id = "00000000-0000-0000-0000-000000000999"

    with pytest.raises(ValueError) as exc:
        await dispatch_tool(
            name="create_booking_request",
            arguments={
                "slot_start": "2026-10-01T15:00:00+05:00",
                "slot_end": "2026-10-01T15:30:00+05:00",
                "channel": "whatsapp",
                "patient_id": foreign_patient_id,
            },
            context=context,
        )
    assert "does not exist or does not belong to clinic" in str(exc.value)


@pytest.mark.asyncio
async def test_real_request_human_handoff_and_audit():
    """Test request_human_handoff creates conversation, handoff, and audit entry."""
    context = {
        "clinic_id": CLINIC_A_ID,
        "session_id": "whatsapp:+923009990003",
        "sender": "+923009990003",
    }
    res = await dispatch_tool(
        name="request_human_handoff",
        arguments={
            "reason": "Severe pain escalation",
            "urgency": "emergency",
            "channel": "whatsapp",
        },
        context=context,
    )
    assert res.handoff_id is not None
    assert res.status == "pending_handoff"
    assert res.urgency == "emergency"

    # Verify conversation and handoff in DB
    async def _verify(conn: asyncpg.Connection):
        h_row = await conn.fetchrow(
            "SELECT conversation_id, reason, urgency FROM handoffs WHERE id = $1::uuid",
            res.handoff_id,
        )
        assert h_row is not None
        assert h_row["urgency"] == "emergency"

        c_row = await conn.fetchrow(
            "SELECT status, channel FROM conversations WHERE id = $1::uuid",
            h_row["conversation_id"],
        )
        assert c_row is not None
        assert c_row["status"] == "pending_handoff"

        # Audit log verification
        a_row = await conn.fetchrow(
            "SELECT action, entity FROM audit_log WHERE entity_id = $1::uuid",
            res.handoff_id,
        )
        assert a_row is not None
        assert a_row["action"] == "handoff.create"

    await with_clinic(CLINIC_A_ID, _verify)


@pytest.mark.asyncio
async def test_real_send_receipt_and_audit():
    """Test send_receipt verifies invoice/receipt, dispatches outbox, and writes audit."""
    context = {"clinic_id": CLINIC_A_ID, "sender": "+923009990001"}

    # 1. Create patient first
    p_res = await dispatch_tool(
        name="create_patient",
        arguments={"full_name": "Receipt Patient", "phone": "+923009990008"},
        context=context,
    )

    # 2. Setup invoice and receipt in DB
    invoice_id = "00000000-0000-4000-a000-000000000021"
    receipt_id = "00000000-0000-4000-a000-000000000022"

    async def _setup_billing(conn: asyncpg.Connection):
        await conn.execute(
            """
            INSERT INTO invoices (
                id, clinic_id, patient_id, invoice_number, total, paid, status
            ) VALUES (
                $1::uuid, $2::uuid, $3::uuid, 'INV-TEST-01', 5000.00, 5000.00, 'paid'
            )
            """,
            invoice_id,
            CLINIC_A_ID,
            p_res.patient_id,
        )
        await conn.execute(
            """
            INSERT INTO receipts (
                id, clinic_id, invoice_id, receipt_number, amount, storage_key
            ) VALUES (
                $1::uuid, $2::uuid, $3::uuid, 'REC-TEST-01', 5000.00, 'receipts/2026/REC-TEST-01.pdf'
            )
            """,
            receipt_id,
            CLINIC_A_ID,
            invoice_id,
        )

    await with_clinic(CLINIC_A_ID, _setup_billing)

    # 3. Execute send_receipt tool
    res = await dispatch_tool(
        name="send_receipt",
        arguments={
            "patient_id": p_res.patient_id,
            "invoice_id": invoice_id,
            "channel": "whatsapp",
        },
        context=context,
    )
    assert res.receipt_id == receipt_id
    assert res.sent is True

    # 4. Verify audit log and dev_outbox
    async def _verify(conn: asyncpg.Connection):
        a_row = await conn.fetchrow(
            "SELECT action, entity, meta FROM audit_log WHERE entity_id = $1::uuid",
            receipt_id,
        )
        assert a_row is not None
        assert a_row["action"] == "receipt.dispatched"

        o_row = await conn.fetchrow(
            "SELECT body, channel FROM dev_outbox WHERE body LIKE '%REC-TEST-01.pdf%' LIMIT 1"
        )
        assert o_row is not None
        assert "Receipt link: receipts/2026/REC-TEST-01.pdf" in o_row["body"]

    await with_clinic(CLINIC_A_ID, _verify)


@pytest.mark.asyncio
async def test_rls_scoping_patient_isolation():
    """
    Deliverable G: RLS isolation proof.
    A patient created under Clinic Alpha is completely invisible when looked up
    from Clinic Beta's context.
    """
    # 1. Create a patient under Clinic Alpha
    create_res = await dispatch_tool(
        name="create_patient",
        arguments={
            "full_name": "Suleman Khan",
            "phone": "+923007778899",
            "consent_type": "data_processing",
        },
        context={"clinic_id": CLINIC_A_ID},
    )
    assert create_res.patient_id is not None

    # 2. Query patient from Clinic Alpha context -> patient IS found
    lookup_alpha = await dispatch_tool(
        name="lookup_patient",
        arguments={"phone": "+923007778899"},
        context={"clinic_id": CLINIC_A_ID},
    )
    assert lookup_alpha.found is True
    assert lookup_alpha.patient is not None
    assert lookup_alpha.patient.id == create_res.patient_id

    # 3. Query the same phone number from Clinic Beta context -> patient IS NOT found
    lookup_beta = await dispatch_tool(
        name="lookup_patient",
        arguments={"phone": "+923007778899"},
        context={"clinic_id": CLINIC_B_ID},
    )
    assert lookup_beta.found is False
    assert lookup_beta.patient is None

    # 4. Direct SQL check under Clinic Beta with RLS enabled
    async def _verify_direct(conn: asyncpg.Connection):
        row = await conn.fetchrow(
            "SELECT id FROM patients WHERE phone = '+923007778899' AND deleted_at IS NULL"
        )
        assert row is None, "RLS violation: Clinic Beta should not see Clinic Alpha patient"

    await with_clinic(CLINIC_B_ID, _verify_direct)
