-- DropIndex
DROP INDEX "orders_user_id_created_at_idx";

-- CreateIndex
CREATE INDEX "orders_user_id_id_idx" ON "orders"("user_id", "id");
