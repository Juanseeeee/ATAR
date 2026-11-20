-- Anotaciones internas del proveedor sobre cada cliente.
CREATE TABLE "CustomerNote" (
    "id" TEXT NOT NULL,
    "supplierCompanyId" TEXT NOT NULL,
    "buyerCompanyId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerNote_supplierCompanyId_buyerCompanyId_createdAt_idx" ON "CustomerNote"("supplierCompanyId", "buyerCompanyId", "createdAt");
