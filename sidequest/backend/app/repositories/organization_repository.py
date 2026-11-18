from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.organization import Organization


class OrganizationRepository:
    @staticmethod
    async def get_by_id(db: AsyncSession, org_id: str) -> Optional[Organization]:
        result = await db.execute(select(Organization).where(Organization.id == org_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def list(db: AsyncSession) -> List[Organization]:
        result = await db.execute(select(Organization).order_by(Organization.name))
        return list(result.scalars().all())

    @staticmethod
    async def create(db: AsyncSession, org: Organization) -> Organization:
        db.add(org)
        await db.commit()
        await db.refresh(org)
        return org
