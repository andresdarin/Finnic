# DBA — desktop-shell

Sin cambios de esquema, migraciones ni queries nuevas. El shell solo reusa endpoints existentes; el evento `finnic:data-changed` puede duplicar lecturas (refetch) en una pantalla, sin impacto relevante en la base.
