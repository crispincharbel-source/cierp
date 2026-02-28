import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, AlertTriangle, TrendingUp, FileText, Download, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Inspection {
  id: string;
  batch: string;
  product: string;
  inspector: string;
  date: string;
  result: string;
  defects: number;
  notes: string;
}

interface ControlPoint {
  id: string;
  name: string;
  parameter: string;
  target: string;
  tolerance: string;
  frequency: string;
  status: string;
}

interface DefectType {
  type: string;
  count: number;
  percentage: number;
  severity: string;
}

export default function QualityModule() {
  const [inspections, setInspections] = useState<Inspection[]>([
    {
      id: 'INS-001',
      batch: 'B-2024-145',
      product: 'Vacuum Bags',
      inspector: 'Sarah Chen',
      date: '2024-11-16',
      result: 'passed',
      defects: 0,
      notes: 'All parameters within specification',
    },
    {
      id: 'INS-002',
      batch: 'B-2024-146',
      product: 'Center Seal',
      inspector: 'Mike Johnson',
      date: '2024-11-16',
      result: 'passed',
      defects: 2,
      notes: 'Minor print alignment issues',
    },
    {
      id: 'INS-003',
      batch: 'B-2024-147',
      product: 'Zipper Pouches',
      inspector: 'Sarah Chen',
      date: '2024-11-15',
      result: 'failed',
      defects: 8,
      notes: 'Zipper seal strength below minimum',
    },
    {
      id: 'INS-004',
      batch: 'B-2024-148',
      product: 'Thermoforming',
      inspector: 'David Lee',
      date: '2024-11-15',
      result: 'passed',
      defects: 1,
      notes: 'Excellent quality',
    },
  ]);

  const [controlPoints] = useState<ControlPoint[]>([
    {
      id: 'CP-001',
      name: 'Film Thickness',
      parameter: 'Thickness',
      target: '200μm',
      tolerance: '±10μm',
      frequency: 'Every 2 hours',
      status: 'compliant',
    },
    {
      id: 'CP-002',
      name: 'Seal Strength',
      parameter: 'Force',
      target: '5.0 N/15mm',
      tolerance: '±0.5 N',
      frequency: 'Every batch',
      status: 'compliant',
    },
    {
      id: 'CP-003',
      name: 'Print Registration',
      parameter: 'Alignment',
      target: '±0.5mm',
      tolerance: '±0.2mm',
      frequency: 'Every 1000 units',
      status: 'warning',
    },
    {
      id: 'CP-004',
      name: 'Zipper Function',
      parameter: 'Open/Close',
      target: '20 cycles',
      tolerance: 'Min 15 cycles',
      frequency: 'Every batch',
      status: 'compliant',
    },
  ]);

  const [defects] = useState<DefectType[]>([
    { type: 'Print Misalignment', count: 45, percentage: 35, severity: 'minor' },
    { type: 'Seal Defect', count: 32, percentage: 25, severity: 'major' },
    { type: 'Film Thickness', count: 28, percentage: 22, severity: 'minor' },
    { type: 'Zipper Malfunction', count: 15, percentage: 12, severity: 'critical' },
    { type: 'Surface Contamination', count: 8, percentage: 6, severity: 'minor' },
  ]);

  // Dialog states
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [defectsDialogOpen, setDefectsDialogOpen] = useState(false);
  const [instructionsDialogOpen, setInstructionsDialogOpen] = useState(false);
  const [newInspectionDialogOpen, setNewInspectionDialogOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [selectedControlPoint, setSelectedControlPoint] = useState<ControlPoint | null>(null);

  // Form states
  const [inspectionForm, setInspectionForm] = useState({
    batch: '',
    product: '',
    inspector: '',
    result: 'passed',
    defects: '',
    notes: '',
  });

  const handleViewReport = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setReportDialogOpen(true);
  };

  const handleViewDefects = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setDefectsDialogOpen(true);
  };

  const handleViewInstructions = (controlPoint: ControlPoint) => {
    setSelectedControlPoint(controlPoint);
    setInstructionsDialogOpen(true);
  };

  const handleExportReport = () => {
    toast.success('Report exported', {
      description: 'Quality inspection report downloaded as PDF',
    });
  };

  const handleNewInspection = () => {
    setInspectionForm({
      batch: '',
      product: '',
      inspector: '',
      result: 'passed',
      defects: '',
      notes: '',
    });
    setNewInspectionDialogOpen(true);
  };

  const handleSubmitInspection = () => {
    if (!inspectionForm.batch || !inspectionForm.product || !inspectionForm.inspector) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newInspection: Inspection = {
      id: `INS-${String(inspections.length + 1).padStart(3, '0')}`,
      batch: inspectionForm.batch,
      product: inspectionForm.product,
      inspector: inspectionForm.inspector,
      date: new Date().toISOString().split('T')[0],
      result: inspectionForm.result,
      defects: parseInt(inspectionForm.defects || '0'),
      notes: inspectionForm.notes,
    };

    setInspections([newInspection, ...inspections]);

    toast.success('Inspection recorded', {
      description: `${newInspection.batch} - ${newInspection.result}`,
    });

    setNewInspectionDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((inspections.filter(i => i.result === 'passed').length / inspections.length) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Inspections</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inspections.length}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Defects Found</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inspections.reduce((sum, i) => sum + i.defects, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+5.2%</div>
            <p className="text-xs text-muted-foreground">Quality improvement</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inspections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="control">Control Points</TabsTrigger>
          <TabsTrigger value="analysis">Defect Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="inspections" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Quality Inspections</CardTitle>
                  <CardDescription>Batch inspection results and findings</CardDescription>
                </div>
                <Button onClick={handleNewInspection}>
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  New Inspection
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inspections.map((inspection) => (
                  <div key={inspection.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{inspection.batch}</h4>
                          <Badge
                            variant="outline"
                            className={
                              inspection.result === 'passed'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }
                          >
                            {inspection.result === 'passed' ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Passed
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Failed
                              </>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{inspection.product}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{inspection.inspector}</p>
                        <p className="text-xs text-muted-foreground">{inspection.date}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Defects Found</p>
                        <p className="font-medium text-lg">{inspection.defects}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Notes</p>
                        <p className="font-medium">{inspection.notes}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleViewReport(inspection)}>
                        <FileText className="h-3 w-3 mr-1" />
                        View Report
                      </Button>
                      {inspection.defects > 0 && (
                        <Button size="sm" variant="outline" onClick={() => handleViewDefects(inspection)}>
                          View Defects
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="control" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Control Points</CardTitle>
              <CardDescription>Critical parameters and monitoring frequency</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {controlPoints.map((point) => (
                  <div key={point.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{point.name}</h4>
                        <p className="text-sm text-muted-foreground">{point.id}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          point.status === 'compliant'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-orange-50 text-orange-700 border-orange-200'
                        }
                      >
                        {point.status === 'compliant' ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Compliant
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Warning
                          </>
                        )}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Parameter</p>
                        <p className="font-medium">{point.parameter}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Target</p>
                        <p className="font-medium">{point.target}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tolerance</p>
                        <p className="font-medium">{point.tolerance}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Frequency</p>
                        <p className="font-medium">{point.frequency}</p>
                      </div>
                    </div>

                    <Button size="sm" variant="outline" onClick={() => handleViewInstructions(point)}>
                      View Instructions
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Defect Analysis - Pareto Chart</CardTitle>
              <CardDescription>Most common quality issues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {defects.map((defect, index) => (
                  <div key={index} className="space-y-2 cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors" onClick={() => {
                    toast.info(defect.type, {
                      description: `${defect.count} occurrences (${defect.percentage}%) - Severity: ${defect.severity}`,
                    });
                  }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{defect.type}</span>
                        <Badge
                          variant="outline"
                          className={
                            defect.severity === 'critical'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : defect.severity === 'major'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }
                        >
                          {defect.severity}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{defect.count}</p>
                        <p className="text-xs text-muted-foreground">{defect.percentage}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          defect.severity === 'critical'
                            ? 'bg-red-600'
                            : defect.severity === 'major'
                            ? 'bg-orange-600'
                            : 'bg-yellow-600'
                        }`}
                        style={{ width: `${defect.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t pt-4">
                <h4 className="font-semibold mb-3">Quality Trend</h4>
                <div className="h-48 flex items-end gap-2">
                  {[92, 89, 94, 91, 95, 93, 96].map((value, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-green-600 rounded-t hover:bg-green-700 transition-colors cursor-pointer" style={{ height: `${value}%` }} onClick={() => {
                        toast.info(`Week ${index + 1}`, {
                          description: `Pass rate: ${value}%`,
                        });
                      }} />
                      <span className="text-xs text-muted-foreground">W{index + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Inspection Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inspection Report</DialogTitle>
            <DialogDescription>{selectedInspection?.id}</DialogDescription>
          </DialogHeader>
          {selectedInspection && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Batch Number</Label>
                  <p className="font-semibold">{selectedInspection.batch}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Product</Label>
                  <p className="font-semibold">{selectedInspection.product}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Inspector</Label>
                  <p className="font-semibold">{selectedInspection.inspector}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-semibold">{selectedInspection.date}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Result</Label>
                  <Badge
                    variant="outline"
                    className={
                      selectedInspection.result === 'passed'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }
                  >
                    {selectedInspection.result}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Defects Found</Label>
                  <p className="font-semibold text-lg">{selectedInspection.defects}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Inspector Notes</Label>
                <p className="mt-2">{selectedInspection.notes}</p>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Inspection Summary</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span>Visual Inspection</span>
                    <Badge variant="outline">Completed</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Dimensional Check</span>
                    <Badge variant="outline">Completed</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Functional Test</span>
                    <Badge variant="outline">Completed</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleExportReport}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={() => setReportDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Defects Dialog */}
      <Dialog open={defectsDialogOpen} onOpenChange={setDefectsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Defect Details</DialogTitle>
            <DialogDescription>Batch {selectedInspection?.batch}</DialogDescription>
          </DialogHeader>
          {selectedInspection && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Total Defects</Label>
                <p className="text-2xl font-bold">{selectedInspection.defects}</p>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Defect Breakdown</Label>
                <div className="space-y-2 mt-2">
                  {defects.slice(0, 3).map((defect, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm">{defect.type}</span>
                      <Badge variant="outline">{Math.floor(Math.random() * 3) + 1}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Corrective Actions</Label>
                <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                  <li>Adjust machine settings</li>
                  <li>Retrain operators</li>
                  <li>Increase inspection frequency</li>
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDefectsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Instructions Dialog */}
      <Dialog open={instructionsDialogOpen} onOpenChange={setInstructionsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inspection Instructions</DialogTitle>
            <DialogDescription>{selectedControlPoint?.name}</DialogDescription>
          </DialogHeader>
          {selectedControlPoint && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Parameter</Label>
                  <p className="font-semibold">{selectedControlPoint.parameter}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Target Value</Label>
                  <p className="font-semibold">{selectedControlPoint.target}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tolerance</Label>
                  <p className="font-semibold">{selectedControlPoint.tolerance}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Frequency</Label>
                  <p className="font-semibold">{selectedControlPoint.frequency}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Inspection Procedure</Label>
                <ol className="list-decimal list-inside space-y-2 mt-2 text-sm">
                  <li>Prepare the measurement equipment</li>
                  <li>Take samples from the production batch</li>
                  <li>Measure the parameter according to standard</li>
                  <li>Record the results in the quality log</li>
                  <li>Compare against target and tolerance</li>
                  <li>Report any deviations immediately</li>
                </ol>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Required Equipment</Label>
                <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                  <li>Digital micrometer (±0.001mm accuracy)</li>
                  <li>Calibrated test equipment</li>
                  <li>Sample collection tools</li>
                  <li>Quality inspection forms</li>
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setInstructionsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Inspection Dialog */}
      <Dialog open={newInspectionDialogOpen} onOpenChange={setNewInspectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Quality Inspection</DialogTitle>
            <DialogDescription>Record a new batch inspection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Batch Number</Label>
              <Input 
                value={inspectionForm.batch}
                onChange={(e) => setInspectionForm({...inspectionForm, batch: e.target.value})}
                placeholder="e.g., B-2024-149"
              />
            </div>
            <div>
              <Label>Product</Label>
              <Select value={inspectionForm.product} onValueChange={(value) => setInspectionForm({...inspectionForm, product: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vacuum Bags">Vacuum Bags</SelectItem>
                  <SelectItem value="Center Seal">Center Seal</SelectItem>
                  <SelectItem value="Zipper Pouches">Zipper Pouches</SelectItem>
                  <SelectItem value="Thermoforming">Thermoforming</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Inspector Name</Label>
              <Input 
                value={inspectionForm.inspector}
                onChange={(e) => setInspectionForm({...inspectionForm, inspector: e.target.value})}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label>Result</Label>
              <Select value={inspectionForm.result} onValueChange={(value) => setInspectionForm({...inspectionForm, result: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Number of Defects</Label>
              <Input 
                type="number"
                value={inspectionForm.defects}
                onChange={(e) => setInspectionForm({...inspectionForm, defects: e.target.value})}
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea 
                value={inspectionForm.notes}
                onChange={(e) => setInspectionForm({...inspectionForm, notes: e.target.value})}
                placeholder="Inspection notes and observations"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewInspectionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitInspection}>Submit Inspection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}