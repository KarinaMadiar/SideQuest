from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.organization import Organization
from app.models.user import User
from app.schemas.organization import OrganizationOut, OrganizationCreate
from app.repositories.organization_repository import OrganizationRepository
from app.api.deps import require_role

router = APIRouter(prefix="/organizations", tags=["Організації"])


@router.get("", response_model=List[OrganizationOut], summary="Список студентських організацій та підрозділів УКУ")
async def list_organizations(db: AsyncSession = Depends(get_db)):
    orgs = await OrganizationRepository.list(db)
    return [OrganizationOut.model_validate(org) for org in orgs]


@router.get("/{id}", response_model=OrganizationOut, summary="Деталі організації")
async def get_organization(id: str, db: AsyncSession = Depends(get_db)):
    org = await OrganizationRepository.get_by_id(db, id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Організацію не знайдено")
    return OrganizationOut.model_validate(org)


@router.post("", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED, summary="Створити організацію")
async def create_organization(
    req: OrganizationCreate,
    current_user: User = Depends(require_role(["admin", "organizer"])),
    db: AsyncSession = Depends(get_db)
):
    org = Organization(
        name=req.name.strip(),
        description=req.description.strip(),
        type=req.type,
        logo_url=req.logo_url
    )
    created = await OrganizationRepository.create(db, org)
    return OrganizationOut.model_validate(created)
