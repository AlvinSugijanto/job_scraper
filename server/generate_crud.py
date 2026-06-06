#!/usr/bin/env python
"""
FastAPI/SQLAlchemy CRUD Layer Scaffolder
Inspects a SQLAlchemy model class and generates corresponding Schema, Repository, Service, Router files,
and registers them automatically in the project imports.
"""

import sys
import os
import re
import importlib

# Add current directory to python path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))


def camel_to_snake(name):
    name = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', name).lower()


def snake_to_camel(name):
    return ''.join(word.capitalize() for word in name.split('_'))


def snake_to_title(name):
    return ' '.join(word.capitalize() for word in name.split('_'))


def pluralize_snake(name):
    if name.endswith("y"):
        return name[:-1] + "ies"
    elif name.endswith("s"):
        return name
    else:
        return name + "s"


def map_type_to_python(col_type):
    t_name = str(col_type).lower()
    if 'varchar' in t_name or 'string' in t_name or 'text' in t_name:
        return 'str'
    elif 'int' in t_name:
        return 'int'
    elif 'bool' in t_name:
        return 'bool'
    elif 'datetime' in t_name:
        return 'datetime'
    elif 'date' in t_name:
        return 'date'
    elif 'float' in t_name or 'numeric' in t_name or 'decimal' in t_name:
        return 'float'
    
    # Check types using sqlalchemy.types imports if possible
    import sqlalchemy.types as types
    if isinstance(col_type, types.String):
        return 'str'
    elif isinstance(col_type, types.Integer):
        return 'int'
    elif isinstance(col_type, types.Boolean):
        return 'bool'
    elif isinstance(col_type, types.DateTime):
        return 'datetime'
    elif isinstance(col_type, types.Float):
        return 'float'
    return 'Any'


def add_to_all_list(content: str, item: str) -> str:
    match = re.search(r'__all__\s*=\s*\[([^\]]*)\]', content, re.DOTALL)
    if not match:
        return content
    
    inner = match.group(1).strip()
    if not inner:
        new_inner = f'"{item}"'
    else:
        elements = [x.strip() for x in re.split(r',\s*', inner) if x.strip()]
        quoted_item = f'"{item}"'
        if quoted_item not in elements:
            elements.append(quoted_item)
            
        if '\n' in match.group(1):
            new_inner = "\n    " + ",\n    ".join(elements) + ",\n"
        else:
            new_inner = ", ".join(elements)
            
    start, end = match.span(1)
    return content[:start] + new_inner + content[end:]


def register_in_init(filepath, import_line, export_name):
    if not os.path.exists(filepath):
        print(f"  [Warning] File not found: {filepath}")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if export_name in content:
        print(f"  [Already Registered] {export_name} in {filepath}")
        return
        
    if import_line in content:
        content_with_import = content
    else:
        all_match = re.search(r'^__all__', content, re.MULTILINE)
        if all_match:
            idx = all_match.start()
            content_with_import = content[:idx] + import_line + "\n" + content[idx:]
        else:
            content_with_import = content + "\n" + import_line + "\n"
        
    updated_content = add_to_all_list(content_with_import, export_name)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(updated_content)
    print(f"  [Registered] {export_name} in {filepath}")


def register_in_main(main_path, router_name):
    if not os.path.exists(main_path):
        print(f"  [Warning] File not found: {main_path}")
        return
        
    with open(main_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if router_name in content:
        print(f"  [Already Registered] {router_name} in {main_path}")
        return
        
    # 1. Update imports
    import_match = re.search(r'from routers import ([^\n]+)', content)
    if import_match:
        imported = [x.strip() for x in import_match.group(1).split(",") if x.strip()]
        if router_name not in imported:
            imported.append(router_name)
        new_import_line = f"from routers import " + ", ".join(imported)
        content = content[:import_match.start()] + new_import_line + content[import_match.end():]
    else:
        content = content.replace("app = FastAPI(", f"from routers import {router_name}\n\napp = FastAPI(")
        
    # 2. Update app.include_router
    include_matches = list(re.finditer(r'app\.include_router\([^\)]+\)', content))
    if include_matches:
        last_match = include_matches[-1]
        insert_idx = last_match.end()
        content = content[:insert_idx] + f"\napp.include_router({router_name})" + content[insert_idx:]
    else:
        if "# ============ ROUTERS ============" in content:
            idx = content.find("# ============ ROUTERS ============")
            eol = content.find("\n", idx)
            content = content[:eol+1] + f"app.include_router({router_name})\n" + content[eol+1:]
               
    with open(main_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  [Registered] Router inclusion in {main_path}")


def deregister_from_all_list(content: str, item: str) -> str:
    match = re.search(r'__all__\s*=\s*\[([^\]]*)\]', content, re.DOTALL)
    if not match:
        return content
    
    inner = match.group(1).strip()
    if not inner:
        return content
        
    elements = [x.strip().strip('"').strip("'") for x in re.split(r',\s*', inner) if x.strip()]
    if item in elements:
        elements.remove(item)
        
    if not elements:
        new_inner = ""
    else:
        quoted_elements = [f'"{x}"' for x in elements]
        if '\n' in match.group(1):
            new_inner = "\n    " + ",\n    ".join(quoted_elements) + ",\n"
        else:
            new_inner = ", ".join(quoted_elements)
            
    start, end = match.span(1)
    return content[:start] + new_inner + content[end:]


def deregister_from_init(filepath, import_line, export_name):
    if not os.path.exists(filepath):
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Remove import line
    content = content.replace(import_line + "\n", "")
    content = content.replace(import_line, "")
    
    # Remove from __all__
    content = deregister_from_all_list(content, export_name)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  [Deregistered] {export_name} from {filepath}")


def deregister_from_main(main_path, router_name):
    if not os.path.exists(main_path):
        return
        
    with open(main_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # 1. Update imports
    import_match = re.search(r'from routers import ([^\n]+)', content)
    if import_match:
        imported = [x.strip() for x in import_match.group(1).split(",") if x.strip()]
        if router_name in imported:
            imported.remove(router_name)
        if imported:
            new_import_line = f"from routers import " + ", ".join(imported)
            content = content[:import_match.start()] + new_import_line + content[import_match.end():]
        else:
            content = content.replace(import_match.group(0) + "\n", "")
            content = content.replace(import_match.group(0), "")
            
    # 2. Update app.include_router
    router_call = f"app.include_router({router_name})"
    content = content.replace(router_call + "\n", "")
    content = content.replace(router_call, "")
               
    with open(main_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  [Deregistered] Router {router_name} from {main_path}")


def main():
    rollback = '--rollback' in sys.argv
    args = [a for a in sys.argv[1:] if a != '--rollback']
    
    if len(args) < 1:
        print("Usage: python generate_crud.py <ModelClassName> [--rollback]")
        print("Example: python generate_crud.py BannedCompany")
        print("Example rollback: python generate_crud.py BannedCompany --rollback")
        sys.exit(1)

    model_class_name = args[0]
    model_snake_name = camel_to_snake(model_class_name)
    model_plural_snake_name = pluralize_snake(model_snake_name)

    if rollback:
        print(f"=== Rolling Back Backend CRUD Layers for {model_class_name} ===")
        
        # 1. Delete generated files
        paths_to_delete = [
            f"schemas/{model_snake_name}.py",
            f"repositories/{model_snake_name}.py",
            f"services/{model_snake_name}.py",
            f"routers/{model_plural_snake_name}.py",
            f"routers/{model_snake_name}.py",
            f"tests/test_{model_snake_name}.py"
        ]
        # Use set to avoid double removal if plural and singular are the same
        for path in sorted(list(set(paths_to_delete))):
            if os.path.exists(path):
                os.remove(path)
                print(f"  [Deleted] {path}")
            else:
                print(f"  [Not Found] {path}")
                
        # 2. Revert registrations
        print("\n=== Reverting Registered Imports ===")
        
        # models/__init__.py
        deregister_from_init(
            "models/__init__.py",
            f"from .{model_snake_name} import {model_class_name}",
            model_class_name
        )
        
        # schemas/__init__.py
        deregister_from_init(
            "schemas/__init__.py",
            f"from .{model_snake_name} import {model_class_name}Create, {model_class_name}Update",
            f"{model_class_name}Create"
        )
        deregister_from_init(
            "schemas/__init__.py",
            f"from .{model_snake_name} import {model_class_name}Create, {model_class_name}Update",
            f"{model_class_name}Update"
        )
        
        # routers/__init__.py (Revert both singular and plural variants of routers)
        router_var_name = f"{model_plural_snake_name}_router"
        deregister_from_init(
            "routers/__init__.py",
            f"from .{model_plural_snake_name} import router as {router_var_name}",
            router_var_name
        )
        deregister_from_init(
            "routers/__init__.py",
            f"from .{model_snake_name} import router as {router_var_name}",
            router_var_name
        )
        # also handle case where router variable itself was singular
        singular_router_var = f"{model_snake_name}_router"
        deregister_from_init(
            "routers/__init__.py",
            f"from .{model_snake_name} import router as {singular_router_var}",
            singular_router_var
        )
        deregister_from_init(
            "routers/__init__.py",
            f"from .{model_plural_snake_name} import router as {singular_router_var}",
            singular_router_var
        )
        
        # main.py
        deregister_from_main("main.py", router_var_name)
        deregister_from_main("main.py", singular_router_var)
        
        print("\nRollback Completed Successfully!")
        sys.exit(0)

    print(f"=== Scaffolding Backend CRUD Layers for {model_class_name} ===")
    
    # Dynamically import the model class
    try:
        model_module = importlib.import_module(f"models.{model_snake_name}")
        model_class = getattr(model_module, model_class_name)
    except Exception as e:
        print(f"Error: Could not import {model_class_name} from models.{model_snake_name}")
        print("Please ensure the model file exists at models/ and is correctly defined.")
        print(f"Details: {e}")
        sys.exit(1)

    # Inspect model columns
    from sqlalchemy.inspection import inspect
    import sqlalchemy.types as types

    try:
        mapper = inspect(model_class)
    except Exception as e:
        print(f"Error: Class {model_class_name} is not a valid SQLAlchemy model class.")
        print(f"Details: {e}")
        sys.exit(1)

    columns_info = []
    for col in mapper.columns:
        columns_info.append({
            'name': col.key,
            'type': col.type,
            'primary_key': col.primary_key,
            'nullable': col.nullable,
            'unique': col.unique or False,
            'default': col.default
        })

    print(f"Detected columns:")
    for col in columns_info:
        print(f"  - {col['name']}: {col['type']} (PK: {col['primary_key']}, Nullable: {col['nullable']})")

    # Primary Key
    pk_col_info = next((c for c in columns_info if c['primary_key']), None)
    if not pk_col_info:
        pk_col = 'id'
        pk_type = 'int'
    else:
        pk_col = pk_col_info['name']
        pk_type = map_type_to_python(pk_col_info['type'])

    # Input columns (exclude auto-increment PK and timestamp fields like created_at)
    input_columns = []
    for col in columns_info:
        p_type = map_type_to_python(col['type'])
        is_pk_int = col['primary_key'] and p_type == 'int'
        is_system_timestamp = col['name'] in ['created_at', 'updated_at']
        if not is_pk_int and not is_system_timestamp:
            input_columns.append(col)

    # Identify search column (prioritize name, keyword, title, or first string)
    search_col = None
    for col_name in ['name', 'keyword', 'title']:
        if any(c['name'] == col_name for c in columns_info):
            search_col = col_name
            break
    if not search_col:
        for col in input_columns:
            if map_type_to_python(col['type']) == 'str':
                search_col = col['name']
                break
    if not search_col and input_columns:
        search_col = input_columns[0]['name']

    search_col_type = 'str'
    if search_col:
        search_col_info = next((c for c in columns_info if c['name'] == search_col), None)
        if search_col_info:
            search_col_type = map_type_to_python(search_col_info['type'])

    # Default sort column
    default_sort_col = None
    if any(c['name'] == 'created_at' for c in columns_info):
        default_sort_col = 'created_at'
    elif search_col:
        default_sort_col = search_col
    else:
        default_sort_col = pk_col

    # Generate directories if they don't exist
    for folder in ['schemas', 'repositories', 'services', 'routers', 'tests']:
        os.makedirs(folder, exist_ok=True)

    # ================= 1. SCHEMA GENERATION =================
    schema_fields = []
    has_datetime = False
    has_optional = False

    for col in input_columns:
        p_type = map_type_to_python(col['type'])
        if p_type == 'datetime':
            has_datetime = True
        if col['nullable']:
            has_optional = True
            schema_fields.append(f"    {col['name']}: Optional[{p_type}] = None")
        else:
            if p_type == 'str':
                schema_fields.append(f"    {col['name']}: str = Field(min_length=1)")
            else:
                schema_fields.append(f"    {col['name']}: {p_type}")

    schema_imports = ["from pydantic import BaseModel, Field", "from typing import Optional"]
    if has_datetime:
        schema_imports.append("from datetime import datetime")

    schema_imports_str = "\n".join(schema_imports)
    fields_base_str = "\n".join(schema_fields) if schema_fields else "    pass"

    schema_update_fields = []
    for col in input_columns:
        p_type = map_type_to_python(col['type'])
        schema_update_fields.append(f"    {col['name']}: Optional[{p_type}] = None")
    fields_update_str = "\n".join(schema_update_fields) if schema_update_fields else "    pass"

    schema_content = f"""\"\"\"
Pydantic Schemas for {snake_to_title(model_plural_snake_name)}.
\"\"\"

{schema_imports_str}


class {model_class_name}Base(BaseModel):
    \"\"\"Schema dasar untuk {snake_to_title(model_snake_name)}.\"\"\"

{fields_base_str}


class {model_class_name}Create({model_class_name}Base):
    \"\"\"Schema untuk membuat {snake_to_title(model_snake_name)} baru.\"\"\"

    pass


class {model_class_name}Update(BaseModel):
    \"\"\"Schema untuk mengubah {snake_to_title(model_snake_name)} secara parsial.\"\"\"

{fields_update_str}
"""
    schema_path = f"schemas/{model_snake_name}.py"
    with open(schema_path, 'w', encoding='utf-8') as f:
        f.write(schema_content)
    print(f"  [Created] {schema_path}")

    # ================= 2. REPOSITORY GENERATION =================
    sort_columns_map_lines = []
    for col in columns_info:
        sort_columns_map_lines.append(f'"{col["name"]}": {model_class_name}.{col["name"]},')
    sort_columns_map = "\n        ".join(sort_columns_map_lines)

    sig_parts = []
    non_nullable_cols = [c for c in input_columns if not c['nullable']]
    nullable_cols = [c for c in input_columns if c['nullable']]

    for col in non_nullable_cols:
        sig_parts.append(f"{col['name']}: {map_type_to_python(col['type'])}")
    for col in nullable_cols:
        sig_parts.append(f"{col['name']}: Optional[{map_type_to_python(col['type'])}] = None")

    create_args_signature = ", ".join(sig_parts)

    assign_parts = []
    for col in input_columns:
        assign_parts.append(f"{col['name']}={col['name']}")
    create_args_assignment = ",\n        ".join(assign_parts)

    update_parts = []
    for col in input_columns:
        update_parts.append(f"db_{model_snake_name}.{col['name']} = {col['name']}")
    update_args_assignment = "\n        ".join(update_parts)

    if search_col:
        search_filter_code = f"""    if search:
        query = query.filter({model_class_name}.{search_col}.ilike(f"%{{search}}%"))"""
    else:
        search_filter_code = "    # No search filter column available"

    if search_col:
        find_method_code = f"""def find(db: Session, {search_col}: {search_col_type}):
    \"\"\"Find a {snake_to_title(model_snake_name)} by {search_col} (case-insensitive).\"\"\"
    return (
        db.query({model_class_name})
        .filter({model_class_name}.{search_col}.ilike({search_col}))
        .first()
    )"""
    else:
        find_method_code = f"""def find(db: Session, pk_val: {pk_type}):
    \"\"\"Find a {snake_to_title(model_snake_name)} by primary key.\"\"\"
    return (
        db.query({model_class_name})
        .filter({model_class_name}.{pk_col} == pk_val)
        .first()
    )"""

    repo_imports = ["from typing import Optional"]
    if any(map_type_to_python(c['type']) == 'datetime' for c in input_columns):
        repo_imports.append("from datetime import datetime")
    repo_imports_str = "\n".join(repo_imports)

    repo_content = f"""\"\"\"
Repository for {model_plural_snake_name} — pure DB operations only.
\"\"\"

from sqlalchemy.orm import Session
from sqlalchemy import asc, desc
{repo_imports_str}
from models.{model_snake_name} import {model_class_name}


def getAll(db: Session):
    \"\"\"Get all {model_plural_snake_name}.\"\"\"
    return db.query({model_class_name}).all()


def get(
    db: Session,
    search: str = None,
    sort_by: str = "{default_sort_col}",
    sort_order: str = "asc",
    page: int = 1,
    per_page: int = 10,
):
    \"\"\"Get {model_plural_snake_name} with search, sort, and pagination.\"\"\"
    query = db.query({model_class_name})

{search_filter_code}

    total = query.count()

    sort_column_map = {{
        {sort_columns_map}
    }}
    sort_column = sort_column_map.get(sort_by, {model_class_name}.{default_sort_col})
    order_func = desc if sort_order == "desc" else asc

    offset = (page - 1) * per_page
    records = query.order_by(order_func(sort_column)).offset(offset).limit(per_page).all()
    return records, total


{find_method_code}


def create(db: Session, data: dict):
    \"\"\"Create a new {snake_to_title(model_snake_name)} record.\"\"\"
    db_{model_snake_name} = {model_class_name}(**data)
    db.add(db_{model_snake_name})
    db.commit()
    db.refresh(db_{model_snake_name})
    return db_{model_snake_name}


def delete(db: Session, {pk_col}: {pk_type}):
    \"\"\"Delete a {snake_to_title(model_snake_name)} by ID. Returns the record or None.\"\"\"
    db_{model_snake_name} = (
        db.query({model_class_name})
        .filter({model_class_name}.{pk_col} == {pk_col})
        .first()
    )
    if db_{model_snake_name}:
        db.delete(db_{model_snake_name})
        db.commit()
    return db_{model_snake_name}


def update(db: Session, {pk_col}: {pk_type}, data: dict):
    \"\"\"Update a {snake_to_title(model_snake_name)} by ID. Returns the record or None.\"\"\"
    db_{model_snake_name} = (
        db.query({model_class_name})
        .filter({model_class_name}.{pk_col} == {pk_col})
        .first()
    )
    if db_{model_snake_name}:
        for key, value in data.items():
            if hasattr(db_{model_snake_name}, key):
                setattr(db_{model_snake_name}, key, value)
        db.commit()
        db.refresh(db_{model_snake_name})
    return db_{model_snake_name}
"""
    repo_path = f"repositories/{model_snake_name}.py"
    with open(repo_path, 'w', encoding='utf-8') as f:
        f.write(repo_content)
    print(f"  [Created] {repo_path}")

    # ================= 3. SERVICE GENERATION =================
    pass_parts = [f"{col['name']}={col['name']}" for col in input_columns]
    create_args_pass = ", ".join(pass_parts)

    if search_col:
        check_duplicate_create = f"""    existing = {model_snake_name}_repo.find(db, data["{search_col}"])
    if existing:
        raise HTTPException(status_code=400, detail="{snake_to_title(model_snake_name)} already exists")"""
        
        check_duplicate_update = f"""    if "{search_col}" in data:
        existing = {model_snake_name}_repo.find(db, data["{search_col}"])
        if existing and existing.{pk_col} != {pk_col}:
            raise HTTPException(status_code=400, detail="{snake_to_title(model_snake_name)} already exists")"""
    else:
        check_duplicate_create = "    pass"
        check_duplicate_update = "    pass"

    service_imports = ["from typing import Optional"]
    if any(map_type_to_python(c['type']) == 'datetime' for c in input_columns):
        service_imports.append("from datetime import datetime")
    service_imports_str = "\n".join(service_imports)

    service_content = f"""\"\"\"
Service layer for {model_plural_snake_name} — business logic.
\"\"\"

from sqlalchemy.orm import Session
from fastapi import HTTPException
{service_imports_str}
from repositories import {model_snake_name} as {model_snake_name}_repo


def get(
    db: Session,
    search: str = None,
    sort_by: str = "{default_sort_col}",
    sort_order: str = "asc",
    page: int = 1,
    per_page: int = 10,
):
    \"\"\"Get paginated {model_plural_snake_name}.\"\"\"
    records, total = {model_snake_name}_repo.get(
        db,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )
    return {{
        "success": True,
        "total": total,
        "data": [r.to_dict() for r in records],
    }}


def create(db: Session, data: dict):
    \"\"\"Create a new {snake_to_title(model_snake_name)}. Raises HTTPException on duplicate.\"\"\"
{check_duplicate_create}

    db_record = {model_snake_name}_repo.create(db, data)
    return {{"success": True, "data": db_record.to_dict()}}


def delete(db: Session, {pk_col}: {pk_type}):
    \"\"\"Delete a {snake_to_title(model_snake_name)}. Raises HTTPException if not found.\"\"\"
    db_record = {model_snake_name}_repo.delete(db, {pk_col})
    if not db_record:
        raise HTTPException(status_code=404, detail="{snake_to_title(model_snake_name)} not found")

    return {{"success": True, "message": "{snake_to_title(model_snake_name)} deleted successfully"}}


def update(db: Session, {pk_col}: {pk_type}, data: dict):
    \"\"\"Update a {snake_to_title(model_snake_name)}. Raises HTTPException on duplicate/not found.\"\"\"
{check_duplicate_update}

    db_record = {model_snake_name}_repo.update(db, {pk_col}, data)
    if not db_record:
        raise HTTPException(status_code=404, detail="{snake_to_title(model_snake_name)} not found")

    return {{"success": True, "data": db_record.to_dict()}}
"""
    service_path = f"services/{model_snake_name}.py"
    with open(service_path, 'w', encoding='utf-8') as f:
        f.write(service_content)
    print(f"  [Created] {service_path}")

    # ================= 4. ROUTER GENERATION =================
    sort_fields_desc = ", ".join(col['name'] for col in columns_info)
    entity_router_prefix = model_plural_snake_name.replace("_", "-")

    router_content = f"""\"\"\"{snake_to_title(model_plural_snake_name)} routes.\"\"\"

from fastapi import APIRouter, Query, Depends
from typing import Optional
from sqlalchemy.orm import Session

from core import get_db
from schemas import {model_class_name}Create, {model_class_name}Update
from services import {model_snake_name} as {model_snake_name}_service

router = APIRouter(
    prefix="/{entity_router_prefix}",
    tags=["{entity_router_prefix}"],
)


@router.get("")
def get(
    search: Optional[str] = Query(None, description="Search {model_plural_snake_name}"),
    sort_by: Optional[str] = Query(
        "{default_sort_col}", description="Sort by field: {sort_fields_desc}"
    ),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(
        10, ge=1, le=10000, alias="perPage", description="Items per page"
    ),
    db: Session = Depends(get_db),
):
    \"\"\"Mendapatkan semua {snake_to_title(model_plural_snake_name)} dengan pagination.\"\"\"
    return {model_snake_name}_service.get(
        db,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )


@router.post("")
def create(body: {model_class_name}Create, db: Session = Depends(get_db)):
    \"\"\"Menambahkan {snake_to_title(model_snake_name)} baru.\"\"\"
    return {model_snake_name}_service.create(db, body.dict())


@router.delete("/{{{pk_col}}}")
def delete({pk_col}: {pk_type}, db: Session = Depends(get_db)):
    \"\"\"Menghapus {snake_to_title(model_snake_name)} berdasarkan ID.\"\"\"
    return {model_snake_name}_service.delete(db, {pk_col})


@router.put("/{{{pk_col}}}")
def update({pk_col}: {pk_type}, body: {model_class_name}Create, db: Session = Depends(get_db)):
    \"\"\"Mengubah data {snake_to_title(model_snake_name)} yang sudah ada (Full Update).\"\"\"
    return {model_snake_name}_service.update(db, {pk_col}, body.dict())


@router.patch("/{{{pk_col}}}")
def patch({pk_col}: {pk_type}, body: {model_class_name}Update, db: Session = Depends(get_db)):
    \"\"\"Mengubah data {snake_to_title(model_snake_name)} secara parsial (Partial Update).\"\"\"
    return {model_snake_name}_service.update(db, {pk_col}, body.dict(exclude_unset=True))
"""
    router_path = f"routers/{model_plural_snake_name}.py"
    with open(router_path, 'w', encoding='utf-8') as f:
        f.write(router_content)
    print(f"  [Created] {router_path}")

    # ================= 5. TEST GENERATION =================
    test_payload_items = []
    test_update_payload_items = []
    test_patch_payload_items = []
    
    for col in input_columns:
        col_name = col['name']
        col_type = map_type_to_python(col['type'])
        
        if col_type == 'str':
            val = f'"test_{col_name}"'
            up_val = f'"updated_{col_name}"'
            patch_val = f'"patched_{col_name}"'
        elif col_type == 'int':
            val = '42'
            up_val = '100'
            patch_val = '50'
        elif col_type == 'bool':
            val = 'True'
            up_val = 'False'
            patch_val = 'True'
        elif col_type == 'float':
            val = '1.5'
            up_val = '2.5'
            patch_val = '3.5'
        else:
            val = 'None'
            up_val = 'None'
            patch_val = 'None'
            
        test_payload_items.append(f'"{col_name}": {val}')
        test_update_payload_items.append(f'"{col_name}": {up_val}')
        test_patch_payload_items.append(f'"{col_name}": {patch_val}')

    test_payload_str = ", ".join(test_payload_items)
    test_update_payload_str = ", ".join(test_update_payload_items)
    test_patch_payload_str = ", ".join(test_patch_payload_items)

    duplicate_check_code = ""
    if search_col:
        duplicate_check_code = f"""


def test_create_{model_snake_name}_duplicate(client):
    payload = {{{test_payload_str}}}
    client.post("/{entity_router_prefix}", json=payload)
    response = client.post("/{entity_router_prefix}", json=payload)
    assert response.status_code == 400
"""

    create_assertions = []
    update_assertions = []
    patch_assertions = []
    
    for col in input_columns:
        col_name = col['name']
        col_type = map_type_to_python(col['type'])
        if col_type == 'datetime':
            continue
            
        val_idx = next(i for i, item in enumerate(test_payload_items) if item.startswith(f'"{col_name}":'))
        val = test_payload_items[val_idx].split(": ", 1)[1]
        
        up_val_idx = next(i for i, item in enumerate(test_update_payload_items) if item.startswith(f'"{col_name}":'))
        up_val = test_update_payload_items[up_val_idx].split(": ", 1)[1]
        
        patch_val_idx = next(i for i, item in enumerate(test_patch_payload_items) if item.startswith(f'"{col_name}":'))
        patch_val = test_patch_payload_items[patch_val_idx].split(": ", 1)[1]
        
        create_assertions.append(f'    assert data["{col_name}"] == {val}')
        update_assertions.append(f'    assert data["{col_name}"] == {up_val}')
        patch_assertions.append(f'    assert data["{col_name}"] == {patch_val}')

    create_assertions_str = "\n".join(create_assertions)
    update_assertions_str = "\n".join(update_assertions)
    patch_assertions_str = "\n".join(patch_assertions)

    test_content = f"""def test_get_{model_plural_snake_name}_empty(client):
    response = client.get("/{entity_router_prefix}")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["total"] == 0
    assert response.json()["data"] == []


def test_create_{model_snake_name}(client):
    payload = {{{test_payload_str}}}
    response = client.post("/{entity_router_prefix}", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    data = response.json()["data"]
    assert data["{pk_col}"] is not None
{create_assertions_str}
{duplicate_check_code}

def test_update_{model_snake_name}_put(client):
    setup_payload = {{{test_payload_str}}}
    setup_resp = client.post("/{entity_router_prefix}", json=setup_payload)
    pk_val = setup_resp.json()["data"]["{pk_col}"]

    update_payload = {{{test_update_payload_str}}}
    response = client.put(f"/{entity_router_prefix}/{{pk_val}}", json=update_payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    data = response.json()["data"]
{update_assertions_str}


def test_update_{model_snake_name}_patch(client):
    setup_payload = {{{test_payload_str}}}
    setup_resp = client.post("/{entity_router_prefix}", json=setup_payload)
    pk_val = setup_resp.json()["data"]["{pk_col}"]

    patch_payload = {{{test_patch_payload_str}}}
    response = client.patch(f"/{entity_router_prefix}/{{pk_val}}", json=patch_payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    data = response.json()["data"]
{patch_assertions_str}


def test_delete_{model_snake_name}(client):
    setup_payload = {{{test_payload_str}}}
    setup_resp = client.post("/{entity_router_prefix}", json=setup_payload)
    pk_val = setup_resp.json()["data"]["{pk_col}"]

    response = client.delete(f"/{entity_router_prefix}/{{pk_val}}")
    assert response.status_code == 200
    assert response.json()["success"] is True

    verify_resp = client.get("/{entity_router_prefix}")
    assert verify_resp.json()["total"] == 0
"""
    test_path = f"tests/test_{model_snake_name}.py"
    with open(test_path, 'w', encoding='utf-8') as f:
        f.write(test_content)
    print(f"  [Created] {test_path}")

    # ================= 6. AUTOMATIC REGISTRATION =================
    print("\n=== Registering Imports ===")
    
    # 5.1 Register Model in models/__init__.py
    register_in_init(
        "models/__init__.py",
        f"from .{model_snake_name} import {model_class_name}",
        model_class_name
    )

    # 5.2 Register Schema in schemas/__init__.py
    register_in_init(
        "schemas/__init__.py",
        f"from .{model_snake_name} import {model_class_name}Create, {model_class_name}Update",
        f"{model_class_name}Create"
    )
    register_in_init(
        "schemas/__init__.py",
        f"from .{model_snake_name} import {model_class_name}Create, {model_class_name}Update",
        f"{model_class_name}Update"
    )

    # 5.3 Register Router in routers/__init__.py
    router_var_name = f"{model_plural_snake_name}_router"
    register_in_init(
        "routers/__init__.py",
        f"from .{model_plural_snake_name} import router as {router_var_name}",
        router_var_name
    )

    # 5.4 Register in main.py
    register_in_main("main.py", router_var_name)

    print("\nScaffolding Completed Successfully!")


if __name__ == "__main__":
    main()
