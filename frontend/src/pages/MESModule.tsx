import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Cpu, Users, BarChart3, Play, Pause, Clock, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';

interface Schedule {
  id: string;
  order: string;
  product: string;
  workcenter: string;
  start: string;
  end: string;
  status: string;
  progress: number;
}

interface Resource {
  name: string;
  type: string;
  capacity: number;
  allocated: number;
  available: number;
  efficiency: number;
}

export default function MESModule() {
  const [schedules, setSchedules] = useState<Schedule[]>([
    {
      id: 'SCH-001',
      order: 'MO-2024-001',
      product: 'Vacuum Bags',
      workcenter: 'Extrusion Line 1',
      start: '08:00',
      end: '16:00',
      status: 'running',
      progress: 65,
    },
    {
      id: 'SCH-002',
      order: 'MO-2024-002',
      product: 'Center Seal',
      workcenter: 'Printing Station 1',
      start: '09:00',
      end: '17:00',
      status: 'running',
      progress: 45,
    },
    {
      id: 'SCH-003',
      order: 'MO-2024-003',
      product: 'Zipper Pouches',
      workcenter: 'Extrusion Line 2',
      start: '10:00',
      end: '18:00',
      status: 'scheduled',
      progress: 0,
    },
    {
      id: 'SCH-004',
      order: 'MO-2024-004',
      product: 'Thermoforming',
      workcenter: 'Slitting Line 1',
      start: '11:00',
      end: '19:00',
      status: 'scheduled',
      progress: 0,
    },
  ]);

  const [resources] = useState<Resource[]>([
    { name: 'Extrusion Line 1', type: 'Machine', capacity: 100, allocated: 85, available: 15, efficiency: 94 },
    { name: 'Extrusion Line 2', type: 'Machine', capacity: 100, allocated: 70, available: 30, efficiency: 87 },
    { name: 'Printing Station 1', type: 'Machine', capacity: 100, allocated: 90, available: 10, efficiency: 92 },
    { name: 'Slitting Line 1', type: 'Machine', capacity: 100, allocated: 60, available: 40, efficiency: 96 },
    { name: 'Day Shift Workers', type: 'Labor', capacity: 42, allocated: 38, available: 4, efficiency: 89 },
    { name: 'Night Shift Workers', type: 'Labor', capacity: 35, allocated: 28, available: 7, efficiency: 85 },
  ]);

  // Dialog states
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // Form states
  const [rescheduleForm, setRescheduleForm] = useState({
    workcenter: '',
    startTime: '',
    endTime: '',
    priority: 'normal',
  });

  const handleStart = (schedule: Schedule) => {
    setSchedules(schedules.map(s => 
      s.id === schedule.id ? { ...s, status: 'running', progress: 5 } : s
    ));
    toast.success('Production started', {
      description: `${schedule.product} on ${schedule.workcenter}`,
    });
  };

  const handlePause = (schedule: Schedule) => {
    setSchedules(schedules.map(s => 
      s.id === schedule.id ? { ...s, status: 'paused' } : s
    ));
    toast.warning('Production paused', {
      description: `${schedule.product} on ${schedule.workcenter}`,
    });
  };

  const handleViewDetails = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setDetailsDialogOpen(true);
  };

  const handleReschedule = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setRescheduleForm({
      workcenter: schedule.workcenter,
      startTime: schedule.start,
      endTime: schedule.end,
      priority: 'normal',
    });
    setRescheduleDialogOpen(true);
  };

  const handleSubmitReschedule = () => {
    if (!rescheduleForm.startTime || !rescheduleForm.endTime) {
      toast.error('Please fill in all time fields');
      return;
    }

    if (!selectedSchedule) return;

    setSchedules(schedules.map(s => 
      s.id === selectedSchedule.id 
        ? { 
            ...s, 
            workcenter: rescheduleForm.workcenter,
            start: rescheduleForm.startTime,
            end: rescheduleForm.endTime,
          } 
        : s
    ));

    toast.success('Schedule updated', {
      description: `${selectedSchedule.product} rescheduled successfully`,
    });

    setRescheduleDialogOpen(false);
  };

  const handleViewReport = () => {
    setReportDialogOpen(true);
  };

  const handleExportReport = () => {
    toast.success('Report exported', {
      description: 'Production schedule report downloaded as PDF',
    });
  };

  const handleViewResource = (resource: Resource) => {
    setSelectedResource(resource);
    setResourceDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Schedules</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schedules.filter(s => s.status === 'running').length}
            </div>
            <p className="text-xs text-muted-foreground">Running now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resource Utilization</CardTitle>
            <Cpu className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">82.5%</div>
            <p className="text-xs text-muted-foreground">Across all resources</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Workers Assigned</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">38 / 42</div>
            <p className="text-xs text-muted-foreground">Day shift</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Efficiency</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">90.5%</div>
            <p className="text-xs text-green-600">+2.3% vs target</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule">Production Schedule</TabsTrigger>
          <TabsTrigger value="gantt">Gantt Chart</TabsTrigger>
          <TabsTrigger value="resources">Resource Allocation</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Today's Production Schedule</CardTitle>
                  <CardDescription>Real-time scheduling and execution tracking</CardDescription>
                </div>
                <Button onClick={handleViewReport}>
                  <FileText className="h-4 w-4 mr-2" />
                  View Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{schedule.product}</h4>
                          <Badge
                            variant="outline"
                            className={
                              schedule.status === 'running'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : schedule.status === 'paused'
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }
                          >
                            {schedule.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {schedule.order} • {schedule.workcenter}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {schedule.start} - {schedule.end}
                        </p>
                        <p className="text-xs text-muted-foreground">8 hours</p>
                      </div>
                    </div>

                    {schedule.status === 'running' && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span className="font-medium">{schedule.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{ width: `${schedule.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {schedule.status === 'scheduled' && (
                        <Button size="sm" onClick={() => handleStart(schedule)}>
                          <Play className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      )}
                      {schedule.status === 'running' && (
                        <Button size="sm" variant="outline" onClick={() => handlePause(schedule)}>
                          <Pause className="h-3 w-3 mr-1" />
                          Pause
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleViewDetails(schedule)}>
                        Details
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReschedule(schedule)}>
                        Reschedule
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gantt" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gantt Chart View</CardTitle>
              <CardDescription>Visual timeline of production schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2 text-xs text-muted-foreground mb-4">
                  <div className="w-32">Workcenter</div>
                  <div className="flex-1 grid grid-cols-12 gap-1">
                    {Array.from({ length: 12 }, (_, i) => (
                      <div key={i} className="text-center">
                        {8 + i}:00
                      </div>
                    ))}
                  </div>
                </div>

                {schedules.map((schedule) => (
                  <div key={schedule.id} className="flex gap-2 items-center">
                    <div className="w-32 text-sm font-medium truncate">{schedule.workcenter}</div>
                    <div className="flex-1 grid grid-cols-12 gap-1 h-12">
                      {Array.from({ length: 12 }, (_, i) => {
                        const hour = 8 + i;
                        const startHour = parseInt(schedule.start.split(':')[0]);
                        const endHour = parseInt(schedule.end.split(':')[0]);
                        const isInRange = hour >= startHour && hour < endHour;

                        return (
                          <div
                            key={i}
                            className={`rounded ${
                              isInRange
                                ? schedule.status === 'running'
                                  ? 'bg-green-500 cursor-pointer hover:bg-green-600'
                                  : schedule.status === 'paused'
                                  ? 'bg-orange-500 cursor-pointer hover:bg-orange-600'
                                  : 'bg-blue-500 cursor-pointer hover:bg-blue-600'
                                : 'bg-gray-100'
                            }`}
                            onClick={() => isInRange && handleViewDetails(schedule)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Capacity Planning</CardTitle>
              <CardDescription>Monitor and optimize resource utilization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resources.map((resource, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleViewResource(resource)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{resource.name}</h4>
                        <p className="text-sm text-muted-foreground">{resource.type}</p>
                      </div>
                      <Badge variant="outline">
                        {resource.efficiency}% Efficiency
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Capacity</p>
                        <p className="font-medium">{resource.capacity}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Allocated</p>
                        <p className="font-medium">{resource.allocated}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Available</p>
                        <p className="font-medium">{resource.available}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Utilization</span>
                        <span className="font-medium">
                          {((resource.allocated / resource.capacity) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            (resource.allocated / resource.capacity) * 100 > 90
                              ? 'bg-red-600'
                              : (resource.allocated / resource.capacity) * 100 > 70
                              ? 'bg-orange-600'
                              : 'bg-green-600'
                          }`}
                          style={{ width: `${(resource.allocated / resource.capacity) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Schedule Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Details</DialogTitle>
            <DialogDescription>{selectedSchedule?.id}</DialogDescription>
          </DialogHeader>
          {selectedSchedule && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Order ID</Label>
                  <p className="font-semibold">{selectedSchedule.order}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Product</Label>
                  <p className="font-semibold">{selectedSchedule.product}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Workcenter</Label>
                  <p className="font-semibold">{selectedSchedule.workcenter}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant="outline">{selectedSchedule.status}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Start Time</Label>
                  <p className="font-semibold">{selectedSchedule.start}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">End Time</Label>
                  <p className="font-semibold">{selectedSchedule.end}</p>
                </div>
              </div>

              {selectedSchedule.status === 'running' && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground">Progress</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-green-600 h-3 rounded-full"
                        style={{ width: `${selectedSchedule.progress}%` }}
                      />
                    </div>
                    <span className="font-semibold">{selectedSchedule.progress}%</span>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Timeline</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span>Scheduled Start</span>
                    <span className="font-medium">{selectedSchedule.start}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Expected End</span>
                    <span className="font-medium">{selectedSchedule.end}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Duration</span>
                    <span className="font-medium">8 hours</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Production</DialogTitle>
            <DialogDescription>Update schedule for {selectedSchedule?.product}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Workcenter</Label>
              <Select value={rescheduleForm.workcenter} onValueChange={(value) => setRescheduleForm({...rescheduleForm, workcenter: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Extrusion Line 1">Extrusion Line 1</SelectItem>
                  <SelectItem value="Extrusion Line 2">Extrusion Line 2</SelectItem>
                  <SelectItem value="Printing Station 1">Printing Station 1</SelectItem>
                  <SelectItem value="Slitting Line 1">Slitting Line 1</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Time</Label>
              <Input 
                type="time"
                value={rescheduleForm.startTime}
                onChange={(e) => setRescheduleForm({...rescheduleForm, startTime: e.target.value})}
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input 
                type="time"
                value={rescheduleForm.endTime}
                onChange={(e) => setRescheduleForm({...rescheduleForm, endTime: e.target.value})}
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={rescheduleForm.priority} onValueChange={(value) => setRescheduleForm({...rescheduleForm, priority: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitReschedule}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Production Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Production Schedule Report</DialogTitle>
            <DialogDescription>Daily production summary and metrics</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Total Schedules</Label>
                <p className="text-2xl font-bold">{schedules.length}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Running</Label>
                <p className="text-2xl font-bold text-green-600">
                  {schedules.filter(s => s.status === 'running').length}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Scheduled</Label>
                <p className="text-2xl font-bold text-blue-600">
                  {schedules.filter(s => s.status === 'scheduled').length}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Avg Progress</Label>
                <p className="text-2xl font-bold">
                  {(schedules.reduce((sum, s) => sum + s.progress, 0) / schedules.length).toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Schedule Breakdown</h4>
              <div className="space-y-2">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="flex justify-between items-center text-sm p-2 bg-muted rounded">
                    <span>{schedule.product}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{schedule.status}</Badge>
                      <span className="font-medium">{schedule.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Resource Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Capacity</span>
                  <span className="font-medium">{resources.reduce((sum, r) => sum + r.capacity, 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Allocated</span>
                  <span className="font-medium">{resources.reduce((sum, r) => sum + r.allocated, 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Available</span>
                  <span className="font-medium">{resources.reduce((sum, r) => sum + r.available, 0)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Avg Utilization</span>
                  <span>
                    {(
                      (resources.reduce((sum, r) => sum + r.allocated, 0) /
                        resources.reduce((sum, r) => sum + r.capacity, 0)) *
                      100
                    ).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleExportReport}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={() => setReportDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resource Details Dialog */}
      <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resource Details</DialogTitle>
            <DialogDescription>{selectedResource?.name}</DialogDescription>
          </DialogHeader>
          {selectedResource && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-semibold">{selectedResource.type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Efficiency</Label>
                  <p className="font-semibold">{selectedResource.efficiency}%</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Capacity</Label>
                  <p className="font-semibold">{selectedResource.capacity}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Allocated</Label>
                  <p className="font-semibold">{selectedResource.allocated}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Available</Label>
                  <p className="font-semibold">{selectedResource.available}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Utilization</Label>
                  <p className="font-semibold">
                    {((selectedResource.allocated / selectedResource.capacity) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Capacity Overview</Label>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full ${
                        (selectedResource.allocated / selectedResource.capacity) * 100 > 90
                          ? 'bg-red-600'
                          : (selectedResource.allocated / selectedResource.capacity) * 100 > 70
                          ? 'bg-orange-600'
                          : 'bg-green-600'
                      }`}
                      style={{ width: `${(selectedResource.allocated / selectedResource.capacity) * 100}%` }}
                    />
                  </div>
                  <span className="font-semibold">
                    {((selectedResource.allocated / selectedResource.capacity) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Status</Label>
                <p className="mt-2">
                  {(selectedResource.allocated / selectedResource.capacity) * 100 > 90 ? (
                    <Badge variant="destructive">Over-utilized</Badge>
                  ) : (selectedResource.allocated / selectedResource.capacity) * 100 > 70 ? (
                    <Badge variant="default">Well-utilized</Badge>
                  ) : (
                    <Badge variant="secondary">Under-utilized</Badge>
                  )}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResourceDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}