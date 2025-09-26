-- CreateTable
CREATE TABLE "I95DevShopifyMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "entityCode" TEXT NOT NULL,
    "shopifyId" TEXT NOT NULL,
    "variantId" TEXT,
    "variantTitle" TEXT,
    "status" TEXT NOT NULL,
    "erpCode" TEXT DEFAULT 'LAR',
    "erpId" TEXT,
    "count" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "I95DevERPMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entityCode" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "variantId" TEXT,
    "variantTitle" TEXT,
    "status" TEXT NOT NULL,
    "erpCode" TEXT DEFAULT 'Laravel',
    "shopifyId" TEXT,
    "counter" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "I95DevErpData" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dataString" TEXT NOT NULL,
    "msgId" INTEGER,
    CONSTRAINT "I95DevErpData_msgId_fkey" FOREIGN KEY ("msgId") REFERENCES "I95DevERPMessage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "extensionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "packetSize" INTEGER NOT NULL DEFAULT 10,
    "component" TEXT NOT NULL DEFAULT 'Laravel',
    "erpUrl" TEXT,
    "emailConfirmations" TEXT,
    "adminEmail" TEXT,
    "adminUsername" TEXT,
    "apiIntegrationToken" TEXT,
    "encryptionPassKey" TEXT,
    "retryLimit" INTEGER NOT NULL DEFAULT 1,
    "mqDataCleanDays" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "I95DevShopifyMessage_shop_idx" ON "I95DevShopifyMessage"("shop");

-- CreateIndex
CREATE INDEX "I95DevShopifyMessage_shopifyId_idx" ON "I95DevShopifyMessage"("shopifyId");

-- CreateIndex
CREATE INDEX "I95DevShopifyMessage_entityCode_idx" ON "I95DevShopifyMessage"("entityCode");

-- CreateIndex
CREATE INDEX "I95DevShopifyMessage_createdAt_idx" ON "I95DevShopifyMessage"("createdAt");

-- CreateIndex
CREATE INDEX "I95DevERPMessage_shopifyId_idx" ON "I95DevERPMessage"("shopifyId");

-- CreateIndex
CREATE INDEX "I95DevERPMessage_entityCode_idx" ON "I95DevERPMessage"("entityCode");

-- CreateIndex
CREATE INDEX "I95DevERPMessage_createdAt_idx" ON "I95DevERPMessage"("createdAt");

-- CreateIndex
CREATE INDEX "I95DevErpData_id_idx" ON "I95DevErpData"("id");

-- CreateIndex
CREATE INDEX "I95DevErpData_msgId_idx" ON "I95DevErpData"("msgId");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_shop_key" ON "Settings"("shop");
