# Database Dockerfile - PostgreSQL with schema and migrations baked in
# Used for Docker Hub deployment so professor doesn't need source files
#
# NOTE: Build context must be the project root directory, not ./database
# Example: docker build -f database/Dockerfile -t spc-database .
FROM postgres:15-alpine

LABEL maintainer="State Placement Cell Team"
LABEL description="PostgreSQL database for State Placement Cell with schema pre-loaded"

# Copy schema as the first init script (runs automatically on first start)
COPY database/schema.sql /docker-entrypoint-initdb.d/01-schema.sql

# Copy migration files in order
COPY backend/migrations/add_job_fields.sql             /docker-entrypoint-initdb.d/02-add_job_fields.sql
COPY backend/migrations/add_name_branch_to_students.sql /docker-entrypoint-initdb.d/03-add_name_branch_to_students.sql
COPY backend/migrations/add_student_resumes_table.sql   /docker-entrypoint-initdb.d/04-add_student_resumes_table.sql
COPY backend/migrations/create_job_requests_table.sql   /docker-entrypoint-initdb.d/05-create_job_requests_table.sql
COPY backend/migrations/replace_job_type_with_vacancies.sql /docker-entrypoint-initdb.d/06-replace_job_type_with_vacancies.sql
