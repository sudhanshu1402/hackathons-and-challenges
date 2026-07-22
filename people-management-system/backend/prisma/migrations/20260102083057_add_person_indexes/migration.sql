-- CreateIndex
CREATE INDEX "Person_lastName_firstName_idx" ON "Person"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Person_location_idx" ON "Person"("location");

-- CreateIndex
CREATE INDEX "Person_qualification_idx" ON "Person"("qualification");

-- CreateIndex
CREATE INDEX "Person_bloodGroup_idx" ON "Person"("bloodGroup");

-- CreateIndex
CREATE INDEX "Person_dateOfBirth_idx" ON "Person"("dateOfBirth");
