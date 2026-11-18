import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from sqlalchemy import select, delete, text

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, AsyncSessionLocal, Base
from app.models import (
    User,
    Organization,
    OrganizationMember,
    SideQuest,
    SideQuestParticipant,
    Event,
    Speaker,
    EventAttendee,
)
from app.utils.security import get_password_hash

KYIV_TZ = ZoneInfo("Europe/Kyiv")


async def seed():
    print("🌱 Початок наповнення бази даних демо-даними...")

    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN cognito_sub VARCHAR(128)"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) NOT NULL DEFAULT 'local'"))
        except Exception:
            pass
        try:
            await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_cognito_sub ON users (cognito_sub)"))
        except Exception:
            pass

    async with AsyncSessionLocal() as db:
        # Check if already seeded to allow idempotent reruns
        existing_admin = await db.execute(select(User).where(User.email == "admin@ucu.edu.ua"))
        if existing_admin.scalar_one_or_none():
            print("⚠️ Демо-користувачі вже існують. Очищення старих демо-даних для чистого оновлення...")
            await db.execute(delete(EventAttendee))
            await db.execute(delete(Speaker))
            await db.execute(delete(Event))
            await db.execute(delete(SideQuestParticipant))
            await db.execute(delete(SideQuest))
            await db.execute(delete(OrganizationMember))
            await db.execute(delete(Organization))
            await db.execute(delete(User))
            await db.commit()

        # 1. Users
        password_hash_student = get_password_hash("StudentPass123!")
        password_hash_organizer = get_password_hash("OrganizerPass123!")
        password_hash_admin = get_password_hash("AdminPass123!")

        student1 = User(
            id="11111111-1111-1111-1111-111111111111",
            email="student@ucu.edu.ua",
            password_hash=password_hash_student,
            name="Остап Мельник",
            role="student",
            profile_description="Студент 2 курсу комп'ютерних наук УКУ. Люблю настільні ігри, каву та ранковий біг.",
            visibility_settings="public"
        )
        student2 = User(
            id="22222222-2222-2222-2222-222222222222",
            email="sofia@ucu.edu.ua",
            password_hash=password_hash_student,
            name="Софія Коваль",
            role="student",
            profile_description="Вивчаю культурологію в УКУ. Цікавлюся театром, урбаністикою та книжковими клубами.",
            visibility_settings="public"
        )
        student3 = User(
            id="33333333-3333-3333-3333-333333333333",
            email="taras@ucu.edu.ua",
            password_hash=password_hash_student,
            name="Тарас Шевченко (демо)",
            role="student",
            profile_description="Прикладна математика, граю в шахи та настільний теніс.",
            visibility_settings="campus_only"
        )
        student4_hidden = User(
            id="44444444-4444-4444-4444-444444444444",
            email="marta@ucu.edu.ua",
            password_hash=password_hash_student,
            name="Марта Франко (демо)",
            role="student",
            profile_description="Конфіденційний профіль для перевірки приватності.",
            visibility_settings="hidden"
        )
        organizer = User(
            id="55555555-5555-5555-5555-555555555555",
            email="organizer@ucu.edu.ua",
            password_hash=password_hash_organizer,
            name="Координатор Спудеїв УКУ",
            role="organizer",
            profile_description="Організаційний відділ студентських ініціатив та подій кампусу.",
            visibility_settings="public"
        )
        admin = User(
            id="66666666-6666-6666-6666-666666666666",
            email="admin@ucu.edu.ua",
            password_hash=password_hash_admin,
            name="Адміністратор Платформи",
            role="admin",
            profile_description="Системне адміністрування та модерація спільноти SideQuest.",
            visibility_settings="public"
        )

        db.add_all([student1, student2, student3, student4_hidden, organizer, admin])
        await db.flush()

        # 2. Organizations
        org1 = Organization(
            id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            name="Уряд Студентів УКУ",
            description="Орган студентського самоврядування Українського Католицького Університету.",
            type="student_council",
            verification_status="verified"
        )
        org2 = Organization(
            id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            name="Центр Розвитку Кар'єри УКУ",
            description="Допомагаємо студентам знайти покликання, першу роботу та побудувати кар'єру.",
            type="university_unit",
            verification_status="verified"
        )
        org3 = Organization(
            id="cccccccc-cccc-cccc-cccc-cccccccccccc",
            name="Клуб Інтелектуальних Ігор УКУ",
            description="Щотижневі турніри з настільних ігор, брейн-ринг та квізи для студентів.",
            type="student_organization",
            verification_status="verified"
        )

        db.add_all([org1, org2, org3])
        await db.flush()

        # Organization membership
        db.add(OrganizationMember(
            organization_id=org1.id,
            user_id=organizer.id,
            role="lead"
        ))
        db.add(OrganizationMember(
            organization_id=org2.id,
            user_id=organizer.id,
            role="member"
        ))
        await db.flush()

        # 3. SideQuests
        now = datetime.now(timezone.utc)

        # SideQuest 1: Morning Coffee (Open, partial spots)
        sq1 = SideQuest(
            id="sq111111-1111-1111-1111-111111111111",
            creator_id=student1.id,
            title="Ранкова кава та брейншторм стартапів",
            description="Шукаю однодумців обговорити ідеї для хакатону за філіжанкою кави або чаю. Поговоримо про AI, мобільні додатки та студентські стартапи.",
            category="coffee",
            starts_at=now + timedelta(days=1, hours=2),
            ends_at=now + timedelta(days=1, hours=3, minutes=30),
            location="Трапезна УКУ, 1 поверх (біля кавомашини)",
            capacity=4,
            status="open"
        )
        # SideQuest 2: Table tennis (Open)
        sq2 = SideQuest(
            id="sq222222-2222-2222-2222-222222222222",
            creator_id=student1.id,
            title="Настільний теніс у Колегіумі",
            description="Хто хоче розім'ятися після пар? Рівень гри будь-який, ракетки та м'ячики є. Граємо парні або один на один.",
            category="sports",
            starts_at=now + timedelta(days=1, hours=8),
            ends_at=now + timedelta(days=1, hours=10),
            location="Колегіум УКУ ім. Патріарха Йосифа Сліпого, спортзал",
            capacity=4,
            status="open"
        )
        # SideQuest 3: Study session (Full)
        sq3 = SideQuest(
            id="sq333333-3333-3333-3333-333333333333",
            creator_id=student2.id,
            title="Спільне опрацювання дедлайну з алгоритмів",
            description="Збираємося в тихій кабінці Центру Шептицького для фокусного розв'язання задач з динамічного програмування.",
            category="study",
            starts_at=now + timedelta(days=2, hours=3),
            ends_at=now + timedelta(days=2, hours=6),
            location="Центр Шептицького, аудиторія 304",
            capacity=3,
            status="full"
        )
        # SideQuest 4: Park Walk (Open)
        sq4 = SideQuest(
            id="sq444444-4444-4444-4444-444444444444",
            creator_id=student2.id,
            title="Вечірня прогулянка Стрийським парком",
            description="Перепочинок від екранів та конспектів. Прогуляємося осіннім парком, погодуємо лебедів та подихаємо свіжим повітрям.",
            category="walks",
            starts_at=now + timedelta(days=3, hours=5),
            ends_at=now + timedelta(days=3, hours=7),
            location="Зустріч біля фонтану перед Центром Шептицького",
            capacity=6,
            status="open"
        )
        # SideQuest 5: Movie Night (Canceled)
        sq5 = SideQuest(
            id="sq555555-5555-5555-5555-555555555555",
            creator_id=student1.id,
            title="Кіновечір класики українського кіно (Скасовано)",
            description="Перегляд стрічки 'Тіні забутих предків'. Подія перенесена на наступний місяць через ремонт обладнання.",
            category="culture",
            starts_at=now + timedelta(days=4, hours=6),
            ends_at=now + timedelta(days=4, hours=9),
            location="Аудиторія 016, Світлиця Колегіуму",
            capacity=10,
            status="canceled"
        )
        # SideQuest 6: Volunteering (Open)
        sq6 = SideQuest(
            id="sq666666-6666-6666-6666-666666666666",
            creator_id=student3.id,
            title="Сортування пластику та макулатури на кампусі",
            description="Годинна волонтерська акція для допомоги еко-ініціативі кампусу. Рукавички та мішки надаються.",
            category="volunteering",
            starts_at=now + timedelta(days=5, hours=2),
            ends_at=now + timedelta(days=5, hours=4),
            location="Еко-пункт позаду будівлі Паркової",
            capacity=8,
            status="open"
        )

        db.add_all([sq1, sq2, sq3, sq4, sq5, sq6])
        await db.flush()

        # SideQuest Participants
        # SQ1: Ostap (creator) + Sofia -> 2 of 4 spots
        db.add(SideQuestParticipant(sidequest_id=sq1.id, user_id=student1.id))
        db.add(SideQuestParticipant(sidequest_id=sq1.id, user_id=student2.id))

        # SQ2: Ostap (creator) -> 1 of 4 spots
        db.add(SideQuestParticipant(sidequest_id=sq2.id, user_id=student1.id))

        # SQ3: Sofia (creator) + Ostap + Taras -> 3 of 3 spots (FULL)
        db.add(SideQuestParticipant(sidequest_id=sq3.id, user_id=student2.id))
        db.add(SideQuestParticipant(sidequest_id=sq3.id, user_id=student1.id))
        db.add(SideQuestParticipant(sidequest_id=sq3.id, user_id=student3.id))

        # SQ4: Sofia (creator) -> 1 of 6 spots
        db.add(SideQuestParticipant(sidequest_id=sq4.id, user_id=student2.id))

        # SQ5: Ostap (creator)
        db.add(SideQuestParticipant(sidequest_id=sq5.id, user_id=student1.id))

        # SQ6: Taras (creator) + Marta (hidden) -> 2 of 8 spots
        db.add(SideQuestParticipant(sidequest_id=sq6.id, user_id=student3.id))
        db.add(SideQuestParticipant(sidequest_id=sq6.id, user_id=student4_hidden.id))

        await db.flush()

        # 4. Campus Events
        # Event 1: Rich details, career panel
        ev1 = Event(
            id="ev111111-1111-1111-1111-111111111111",
            organization_id=org2.id,
            creator_id=organizer.id,
            title="Кар'єрна панель: Від стажування до Senior в IT",
            description="Панельна дискусія з провідними інженерами та рекрутерами про стан ринку праці, вимоги до випускників технічних спеціальностей та практичні кроки для успішного кар'єрного старту.",
            category="career",
            starts_at=now + timedelta(days=2, hours=4),
            ends_at=now + timedelta(days=2, hours=6, minutes=30),
            location="Центр Шептицького, Велика зала (ауд. 002)",
            registration_url="https://career.ucu.edu.ua/events/tech-panel-2026",
            why_attend="1. Зрозумієте, які навички шукають компанії у 2026 році.\n2. Дізнаєтеся типові помилки на технічних інтерв'ю та скринінгу резюме.\n3. Можливість особисто поставити запитання спікерам під час кава-брейку.",
            preparation_notes="1. Підготуйте резюме в електронному вигляді або роздрукуйте для швидкого фідбеку.\n2. Сформулюйте 1-2 конкретні запитання про кар'єрний трек, який вас цікавить.\n3. Завітайте за 10 хвилин до початку для зайняття зручного місця.",
            status="published"
        )

        # Speakers for Event 1
        sp1 = Speaker(
            event_id=ev1.id,
            name="Олександр Дем'яненко (демо)",
            short_bio="Senior Staff Engineer у міжнародній технологічній компанії, випускник факультету прикладних наук УКУ.",
            position="Staff Software Engineer",
            linkedin_url="https://linkedin.com/in/demo-oleksandr",
            display_order=1
        )
        sp2 = Speaker(
            event_id=ev1.id,
            name="Олена Мельничук (демо)",
            short_bio="Керівниця рекрутингу з понад 8 роками досвіду у підборі інженерних команд та кар'єрному консультуванні студентів.",
            position="Head of Talent Acquisition",
            linkedin_url="https://linkedin.com/in/demo-olena",
            display_order=2
        )

        # Event 2: Student Council Workshop
        ev2 = Event(
            id="ev222222-2222-2222-2222-222222222222",
            organization_id=org1.id,
            creator_id=organizer.id,
            title="Воркшоп з публічних виступів та презентації студентських ініціатив",
            description="Практичний тренінг з риторики, подолання страху публіки та структурування пітчів для захисту проєктів чи презентацій на парах.",
            category="workshop",
            starts_at=now + timedelta(days=4, hours=5),
            ends_at=now + timedelta(days=4, hours=8),
            location="Академічний корпус, ауд. 107",
            registration_url="https://studentgov.ucu.edu.ua/workshops/public-speaking",
            why_attend="Навчитеся чітко доносити думку без 'води' та впевнено тримати увагу аудиторії навіть у стресових умовах.",
            preparation_notes="Принесіть чернетку ідеї або презентації, яку плануєте виголошувати найближчим часом.",
            status="published"
        )
        sp3 = Speaker(
            event_id=ev2.id,
            name="Ірина Кравчук (демо)",
            short_bio="Тренерка з ораторської майстерності та дебатів, фіналістка національних дебатних турнірів.",
            position="Тренерка з комунікацій",
            linkedin_url="https://linkedin.com/in/demo-iryna",
            display_order=1
        )

        # Event 3: Minimal fields (No optional why_attend, no prep_notes, no speakers)
        # This explicitly tests and guarantees the requirement:
        # "Missing 'Why attend?' or speaker information does not break the page. Show a polished empty state."
        ev3 = Event(
            id="ev333333-3333-3333-3333-333333333333",
            organization_id=None,
            creator_id=organizer.id,
            title="Відкрита дискусія: Етика та штучний інтелект",
            description="Круглий стіл для обговорення сучасних трансформацій суспільства під впливом великих мовних моделей та автономних систем.",
            category="lecture",
            starts_at=now + timedelta(days=6, hours=6),
            ends_at=now + timedelta(days=6, hours=8),
            location="Центр Шептицького, Паркова аудиторія",
            registration_url=None,
            why_attend=None,
            preparation_notes=None,
            status="published"
        )

        # Event 4: Canceled event
        ev4 = Event(
            id="ev444444-4444-4444-4444-444444444444",
            organization_id=org3.id,
            creator_id=organizer.id,
            title="Міжфакультетський турнір з 'Що? Де? Коли?' (Скасовано)",
            description="Турнір інтелектуальних ігор перенесено на весняний семестр у зв'язку з оптимізацією розкладу модульних контрольних.",
            category="social",
            starts_at=now + timedelta(days=7, hours=7),
            ends_at=now + timedelta(days=7, hours=10),
            location="Трапезна УКУ",
            registration_url=None,
            why_attend=None,
            preparation_notes=None,
            status="canceled"
        )

        db.add_all([ev1, ev2, ev3, ev4])
        await db.flush()

        db.add_all([sp1, sp2, sp3])
        await db.flush()

        # Event Attendees
        db.add(EventAttendee(event_id=ev1.id, user_id=student1.id))
        db.add(EventAttendee(event_id=ev1.id, user_id=student2.id))
        db.add(EventAttendee(event_id=ev2.id, user_id=student1.id))

        await db.commit()

    print("✅ Базу даних успішно заповнено правдивими демо-даними!")
    print("👤 Демо акаунти:")
    print("   Студент:    student@ucu.edu.ua   / StudentPass123!")
    print("   Організатор: organizer@ucu.edu.ua / OrganizerPass123!")
    print("   Адмін:      admin@ucu.edu.ua     / AdminPass123!")


if __name__ == "__main__":
    asyncio.run(seed())
