"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  ScanLine,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Camera,
} from "lucide-react";

export function MoveInContent() {
  const { user } = useAuth();
  // TODO: Add project selector when multi-project support is needed
  const selectedProject = "92364";
  const [caseInput, setCaseInput] = useState("");
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [locationInput, setLocationInput] = useState("");
  const [damageNotes, setDamageNotes] = useState("");
  const [showDamageSheet, setShowDamageSheet] = useState(false);

  // Queries
  const moveInProgress = useQuery(api.caseTracking.getMoveInProgress, {
    projectNumber: selectedProject,
  });

  const caseTracking = useQuery(
    api.caseTracking.getCaseByNumber,
    selectedCase
      ? {
          projectNumber: selectedProject,
          caseNumber: selectedCase,
        }
      : "skip",
  );

  const allCases = useQuery(api.caseTracking.getCasesByProject, {
    projectNumber: selectedProject,
  });

  // Mutations
  const recordArrival = useMutation(api.caseTracking.recordCaseArrival);
  const setCaseLocation = useMutation(api.caseTracking.setCaseLocation);
  const reportDamage = useMutation(api.caseTracking.reportDamage);

  // Handle case scan/input
  const handleCaseScan = (scannedCase: string) => {
    const trimmedCase = scannedCase.trim();
    if (!trimmedCase) return;

    setSelectedCase(trimmedCase);
    setCaseInput(trimmedCase);
  };

  // Handle recording arrival
  const handleRecordArrival = async () => {
    if (!selectedCase || !user) return;

    try {
      await recordArrival({
        projectNumber: selectedProject,
        caseNumber: selectedCase,
        userId: user._id,
        caseLocation: locationInput || undefined,
      });

      toast.success(`Case ${selectedCase} arrival recorded`);
      setCaseInput("");
      setSelectedCase(null);
      setLocationInput("");
    } catch (error) {
      toast.error(`Failed to record arrival: ${error}`);
    }
  };

  // Handle location update
  const handleUpdateLocation = async () => {
    if (!selectedCase || !locationInput) return;

    try {
      await setCaseLocation({
        projectNumber: selectedProject,
        caseNumber: selectedCase,
        caseLocation: locationInput,
      });

      toast.success(`Location updated for case ${selectedCase}`);
    } catch (error) {
      toast.error(`Failed to update location: ${error}`);
    }
  };

  // Handle damage report
  const handleReportDamage = async () => {
    if (!selectedCase || !damageNotes) return;

    try {
      await reportDamage({
        projectNumber: selectedProject,
        caseNumber: selectedCase,
        damageNotes: damageNotes,
      });

      toast.success(`Damage report submitted for case ${selectedCase}`);
      setDamageNotes("");
      setShowDamageSheet(false);
    } catch (error) {
      toast.error(`Failed to report damage: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Case Move-In</h1>
            <p className="text-xs text-muted-foreground">
              Project {selectedProject}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">{user?.name || user?.email}</span>
          </div>
        </div>
      </header>

      {/* Progress Section */}
      {moveInProgress && (
        <div className="border-b bg-muted/30 px-4 py-4">
          <div className="container mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Move-In Progress</span>
              <span className="text-sm text-muted-foreground">
                {moveInProgress.arrivedCases} / {moveInProgress.totalCases}{" "}
                cases
              </span>
            </div>
            <Progress value={moveInProgress.percentComplete} className="h-2" />
            <div className="flex gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="bg-blue-50">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {moveInProgress.arrivedCases} Arrived
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="bg-gray-50">
                  <Clock className="h-3 w-3 mr-1" />
                  {moveInProgress.expectedCases} Expected
                </Badge>
              </div>
              {moveInProgress.overdueCases > 0 && (
                <div className="flex items-center gap-1">
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {moveInProgress.overdueCases} Overdue
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Scan Input Section */}
        <Card className="p-4">
          <div className="space-y-3">
            <Label htmlFor="case-input">Case Number</Label>
            <div className="flex gap-2">
              <Input
                id="case-input"
                placeholder="Scan or enter case number..."
                value={caseInput}
                onChange={(e) => setCaseInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCaseScan(caseInput);
                  }
                }}
                className="flex-1"
              />
              <Button
                size="default"
                onClick={() => handleCaseScan(caseInput)}
                disabled={!caseInput.trim()}
              >
                <ScanLine className="h-4 w-4 mr-2" />
                Scan
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use camera scanner or type case number manually
            </p>
          </div>
        </Card>

        {/* Case Details (when case is selected/scanned) */}
        {selectedCase && (
          <Card className="p-4 border-2 border-primary">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedCase}</h3>
                  <p className="text-sm text-muted-foreground">
                    {caseTracking?.moveInStatus === "arrived"
                      ? "Already arrived"
                      : "Ready to record arrival"}
                  </p>
                </div>
                {caseTracking?.moveInStatus === "arrived" && (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Arrived
                  </Badge>
                )}
              </div>

              {/* Location Input */}
              <div className="space-y-2">
                <Label htmlFor="location-input">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Location
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="location-input"
                    placeholder="Warehouse zone, bay, etc."
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    className="flex-1"
                  />
                  {caseTracking?.moveInStatus === "arrived" && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={handleUpdateLocation}
                      disabled={!locationInput}
                    >
                      Update
                    </Button>
                  )}
                </div>
                {caseTracking?.caseLocation && (
                  <p className="text-xs text-muted-foreground">
                    Current: {caseTracking.caseLocation}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {caseTracking?.moveInStatus !== "arrived" && (
                  <Button
                    className="flex-1"
                    size="lg"
                    onClick={handleRecordArrival}
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Mark Arrived
                  </Button>
                )}

                <Sheet open={showDamageSheet} onOpenChange={setShowDamageSheet}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="lg"
                      className={
                        caseTracking?.damageReported
                          ? "border-orange-500 text-orange-600"
                          : ""
                      }
                    >
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      {caseTracking?.damageReported
                        ? "Damage Reported"
                        : "Report Damage"}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85vh]">
                    <SheetHeader>
                      <SheetTitle>Report Damage - {selectedCase}</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="damage-notes">Damage Description</Label>
                        <Textarea
                          id="damage-notes"
                          placeholder="Describe the damage observed..."
                          value={damageNotes}
                          onChange={(e) => setDamageNotes(e.target.value)}
                          rows={6}
                          className="resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Photos</Label>
                        <Button variant="outline" className="w-full">
                          <Camera className="h-4 w-4 mr-2" />
                          Add Photo
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Photo capture will be implemented in US-029
                        </p>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setShowDamageSheet(false);
                            setDamageNotes("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={handleReportDamage}
                          disabled={!damageNotes.trim()}
                        >
                          Submit Report
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </Card>
        )}

        {/* Recent Cases List */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Recent Cases
          </h2>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {allCases?.map((caseRecord) => (
                <Card
                  key={caseRecord._id}
                  className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setSelectedCase(caseRecord.caseNumber);
                    setCaseInput(caseRecord.caseNumber);
                    setLocationInput(caseRecord.caseLocation || "");
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {caseRecord.caseNumber}
                        </span>
                        {caseRecord.moveInStatus === "arrived" && (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700"
                          >
                            Arrived
                          </Badge>
                        )}
                        {caseRecord.moveInStatus === "overdue" && (
                          <Badge variant="destructive">Overdue</Badge>
                        )}
                        {caseRecord.damageReported && (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                      {caseRecord.caseLocation && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 inline mr-1" />
                          {caseRecord.caseLocation}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              {allCases && allCases.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No cases recorded yet</p>
                  <p className="text-xs mt-1">Scan a case to get started</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Large Scan Button at Bottom (Mobile-First) */}
      <div className="sticky bottom-0 border-t bg-background p-4">
        <Button
          size="lg"
          className="w-full h-14 text-lg"
          onClick={() => {
            // Focus the input for scanning
            document.getElementById("case-input")?.focus();
          }}
        >
          <ScanLine className="h-6 w-6 mr-2" />
          Scan Case Barcode
        </Button>
      </div>
    </div>
  );
}
