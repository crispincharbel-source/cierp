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
import { Package, Wrench, Calendar, AlertTriangle, FileText, Download, Settings, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  version: string;
  status: string;
  bom: string[];
  lastChange: string;
  changeType: string;
}

interface MaintenanceTask {
  id: string;
  equipment: string;
  type: string;
  scheduled: string;
  status: string;
  priority: string;
  assignee: string;
  description: string;
}

interface Equipment {
  name: string;
  health: number;
  lastService: string;
  nextService: string;
  status: string;
  hoursRun: number;
}

export default function PLMMaintenanceModule() {
  const [products, setProducts] = useState<Product[]>([
    {
      id: 'PLM-001',
      name: 'Vacuum Bags - 200μm',
      version: 'v3.2',
      status: 'Active',
      bom: ['PE Film Roll', 'EVOH Barrier Layer', 'Adhesive Resin'],
      lastChange: '2024-11-10',
      changeType: 'Material Spec Update',
    },
    {
      id: 'PLM-002',
      name: 'Center Seal Bags',
      version: 'v2.1',
      status: 'Active',
      bom: ['PP Film Roll', 'Printing Ink', 'Adhesive Resin'],
      lastChange: '2024-11-05',
      changeType: 'Design Revision',
    },
    {
      id: 'PLM-003',
      name: 'Zipper Stand-up Pouches',
      version: 'v4.0',
      status: 'Under Review',
      bom: ['PE Film Roll', 'Zipper Components', 'Printing Ink', 'Adhesive Resin'],
      lastChange: '2024-11-14',
      changeType: 'New Feature Addition',
    },
    {
      id: 'PLM-004',
      name: 'Thermoforming Films',
      version: 'v1.5',
      status: 'Active',
      bom: ['PE Film Roll', 'EVOH Barrier Layer'],
      lastChange: '2024-10-28',
      changeType: 'Process Optimization',
    },
  ]);

  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([
    {
      id: 'MT-001',
      equipment: 'Extrusion Line 1',
      type: 'Preventive',
      scheduled: '2024-11-18',
      status: 'Scheduled',
      priority: 'High',
      assignee: 'John Tech',
      description: 'Replace extrusion die and clean barrel',
    },
    {
      id: 'MT-002',
      equipment: 'Printing Station 1',
      type: 'Corrective',
      scheduled: '2024-11-16',
      status: 'In Progress',
      priority: 'Critical',
      assignee: 'Sarah Mech',
      description: 'Fix ink delivery system malfunction',
    },
    {
      id: 'MT-003',
      equipment: 'Laminating Station',
      type: 'Preventive',
      scheduled: '2024-11-20',
      status: 'Scheduled',
      priority: 'Medium',
      assignee: 'Mike Elec',
      description: 'Calibrate temperature controls and replace rollers',
    },
    {
      id: 'MT-004',
      equipment: 'Slitting Line 1',
      type: 'Predictive',
      scheduled: '2024-11-22',
      status: 'Scheduled',
      priority: 'Low',
      assignee: 'David Tech',
      description: 'Blade sharpening and alignment check',
    },
  ]);

  const [equipment] = useState<Equipment[]>([
    { name: 'Extrusion Line 1', health: 85, lastService: '2024-10-15', nextService: '2024-11-18', status: 'Operational', hoursRun: 4520 },
    { name: 'Extrusion Line 2', health: 92, lastService: '2024-10-20', nextService: '2024-11-25', status: 'Operational', hoursRun: 3890 },
    { name: 'Printing Station 1', health: 68, lastService: '2024-10-01', nextService: '2024-11-16', status: 'Needs Attention', hoursRun: 5200 },
    { name: 'Laminating Station', health: 45, lastService: '2024-09-15', nextService: '2024-11-20', status: 'Under Maintenance', hoursRun: 6100 },
    { name: 'Slitting Line 1', health: 95, lastService: '2024-10-25', nextService: '2024-11-30', status: 'Operational', hoursRun: 2800 },
  ]);

  // Dialog states
  const [bomDialogOpen, setBomDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [taskDetailsDialogOpen, setTaskDetailsDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [equipmentDialogOpen, setEquipmentDialogOpen] = useState(false);
  const [newTaskDialogOpen, setNewTaskDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  // Form states
  const [manageForm, setManageForm] = useState({
    name: '',
    version: '',
    status: '',
  });

  const [rescheduleForm, setRescheduleForm] = useState({
    date: '',
    assignee: '',
    priority: '',
  });

  const [newTaskForm, setNewTaskForm] = useState({
    equipment: '',
    type: 'Preventive',
    scheduled: '',
    priority: 'Medium',
    assignee: '',
    description: '',
  });

  const handleViewBOM = (product: Product) => {
    setSelectedProduct(product);
    setBomDialogOpen(true);
  };

  const handleManage = (product: Product) => {
    setSelectedProduct(product);
    setManageForm({
      name: product.name,
      version: product.version,
      status: product.status,
    });
    setManageDialogOpen(true);
  };

  const handleSubmitManage = () => {
    if (!selectedProduct) return;

    setProducts(products.map(p =>
      p.id === selectedProduct.id
        ? { ...p, name: manageForm.name, version: manageForm.version, status: manageForm.status }
        : p
    ));

    toast.success('Product updated', {
      description: `${manageForm.name} ${manageForm.version} saved`,
    });

    setManageDialogOpen(false);
  };

  const handleReviewChanges = (product: Product) => {
    setSelectedProduct(product);
    setChangeDialogOpen(true);
  };

  const handleApproveChange = () => {
    if (!selectedProduct) return;

    setProducts(products.map(p =>
      p.id === selectedProduct.id ? { ...p, status: 'Active' } : p
    ));

    toast.success('Change approved', {
      description: `${selectedProduct.name} changes have been approved`,
    });

    setChangeDialogOpen(false);
  };

  const handleViewTaskDetails = (task: MaintenanceTask) => {
    setSelectedTask(task);
    setTaskDetailsDialogOpen(true);
  };

  const handleRescheduleTask = (task: MaintenanceTask) => {
    setSelectedTask(task);
    setRescheduleForm({
      date: task.scheduled,
      assignee: task.assignee,
      priority: task.priority,
    });
    setRescheduleDialogOpen(true);
  };

  const handleSubmitReschedule = () => {
    if (!selectedTask || !rescheduleForm.date) {
      toast.error('Please fill in all fields');
      return;
    }

    setMaintenanceTasks(maintenanceTasks.map(t =>
      t.id === selectedTask.id
        ? { ...t, scheduled: rescheduleForm.date, assignee: rescheduleForm.assignee, priority: rescheduleForm.priority }
        : t
    ));

    toast.success('Task rescheduled', {
      description: `${selectedTask.equipment} maintenance updated`,
    });

    setRescheduleDialogOpen(false);
  };

  const handleCompleteTask = (task: MaintenanceTask) => {
    setMaintenanceTasks(maintenanceTasks.map(t =>
      t.id === task.id ? { ...t, status: 'Completed' } : t
    ));

    toast.success('Task completed', {
      description: `${task.equipment} maintenance marked as complete`,
    });
  };

  const handleViewEquipment = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setEquipmentDialogOpen(true);
  };

  const handleNewTask = () => {
    setNewTaskForm({
      equipment: '',
      type: 'Preventive',
      scheduled: '',
      priority: 'Medium',
      assignee: '',
      description: '',
    });
    setNewTaskDialogOpen(true);
  };

  const handleSubmitNewTask = () => {
    if (!newTaskForm.equipment || !newTaskForm.scheduled || !newTaskForm.assignee) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newTask: MaintenanceTask = {
      id: `MT-${String(maintenanceTasks.length + 1).padStart(3, '0')}`,
      equipment: newTaskForm.equipment,
      type: newTaskForm.type,
      scheduled: newTaskForm.scheduled,
      status: 'Scheduled',
      priority: newTaskForm.priority,
      assignee: newTaskForm.assignee,
      description: newTaskForm.description,
    };

    setMaintenanceTasks([newTask, ...maintenanceTasks]);

    toast.success('Maintenance task created', {
      description: `${newTask.equipment} - ${newTask.type}`,
    });

    setNewTaskDialogOpen(false);
  };

  const handleExport = () => {
    toast.success('Report exported', {
      description: 'Report downloaded as PDF',
    });
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.filter(p => p.status === 'Active').length}</div>
            <p className="text-xs text-muted-foreground">In production</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Wrench className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maintenanceTasks.filter(t => t.status !== 'Completed').length}</div>
            <p className="text-xs text-muted-foreground">Maintenance tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Equipment Health</CardTitle>
            <Settings className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(equipment.reduce((sum, e) => sum + e.health, 0) / equipment.length).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">Across all equipment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.filter(p => p.status === 'Under Review').length}</div>
            <p className="text-xs text-muted-foreground">Product changes</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Product Lifecycle</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="equipment">Equipment Health</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Lifecycle Management</CardTitle>
              <CardDescription>Manage products, BOMs, and engineering changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {products.map((product) => (
                  <div key={product.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{product.name}</h4>
                          <Badge variant="secondary">{product.version}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{product.id}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          product.status === 'Active'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }
                      >
                        {product.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Last Change</p>
                        <p className="font-medium">{product.lastChange}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Change Type</p>
                        <p className="font-medium">{product.changeType}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => handleViewBOM(product)}>
                        <FileText className="h-3 w-3 mr-1" />
                        View BOM
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleManage(product)}>
                        <Settings className="h-3 w-3 mr-1" />
                        Manage
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReviewChanges(product)}>
                        Review Changes
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Maintenance Schedule</CardTitle>
                  <CardDescription>Preventive, corrective, and predictive maintenance</CardDescription>
                </div>
                <Button onClick={handleNewTask}>
                  <Wrench className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {maintenanceTasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{task.equipment}</h4>
                          <Badge variant="secondary">{task.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{task.id}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          variant={task.priority === 'Critical' ? 'destructive' : task.priority === 'High' ? 'default' : 'secondary'}
                        >
                          {task.priority}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            task.status === 'Completed'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : task.status === 'In Progress'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-gray-50 text-gray-700 border-gray-200'
                          }
                        >
                          {task.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Scheduled</p>
                        <p className="font-medium">{task.scheduled}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Assignee</p>
                        <p className="font-medium">{task.assignee}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Description</p>
                        <p className="font-medium truncate">{task.description}</p>
                      </div>
                    </div>

                    {task.status !== 'Completed' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewTaskDetails(task)}>
                          View Details
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleRescheduleTask(task)}>
                          Reschedule
                        </Button>
                        <Button size="sm" onClick={() => handleCompleteTask(task)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Complete
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Health Dashboard</CardTitle>
              <CardDescription>Monitor equipment condition and service schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {equipment.map((eq, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleViewEquipment(eq)}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{eq.name}</CardTitle>
                        <Badge
                          variant="outline"
                          className={
                            eq.status === 'Operational'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : eq.status === 'Needs Attention'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }
                        >
                          {eq.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Health Score</span>
                          <span className="font-bold">{eq.health}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${
                              eq.health >= 80 ? 'bg-green-600' : eq.health >= 60 ? 'bg-orange-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${eq.health}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Last Service</p>
                          <p className="font-medium">{eq.lastService}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Next Service</p>
                          <p className="font-medium">{eq.nextService}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Hours Run</p>
                          <p className="font-medium">{eq.hoursRun.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* BOM Dialog */}
      <Dialog open={bomDialogOpen} onOpenChange={setBomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bill of Materials</DialogTitle>
            <DialogDescription>{selectedProduct?.name} - {selectedProduct?.version}</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="space-y-2">
                {selectedProduct.bom.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{item}</span>
                    </div>
                    <Badge variant="outline">Component</Badge>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">BOM Summary</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Components</span>
                    <span className="font-medium">{selectedProduct.bom.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Version</span>
                    <span className="font-medium">{selectedProduct.version}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Last Updated</span>
                    <span className="font-medium">{selectedProduct.lastChange}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setBomDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Product Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Product</DialogTitle>
            <DialogDescription>Edit product details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product Name</Label>
              <Input
                value={manageForm.name}
                onChange={(e) => setManageForm({ ...manageForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Version</Label>
              <Input
                value={manageForm.version}
                onChange={(e) => setManageForm({ ...manageForm, version: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={manageForm.status} onValueChange={(value) => setManageForm({ ...manageForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Under Review">Under Review</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitManage}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Changes Dialog */}
      <Dialog open={changeDialogOpen} onOpenChange={setChangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Engineering Changes</DialogTitle>
            <DialogDescription>{selectedProduct?.name}</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Change Type</Label>
                  <p className="font-semibold">{selectedProduct.changeType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-semibold">{selectedProduct.lastChange}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Current Version</Label>
                  <p className="font-semibold">{selectedProduct.version}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant="outline">{selectedProduct.status}</Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Change Details</Label>
                <div className="space-y-2 mt-2">
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <p className="font-medium">Summary</p>
                    <p className="text-muted-foreground mt-1">
                      {selectedProduct.changeType} applied to {selectedProduct.name}. 
                      All BOM components verified and updated.
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <p className="font-medium">Impact Assessment</p>
                    <p className="text-muted-foreground mt-1">
                      No impact on existing production orders. New specifications apply to future batches.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeDialogOpen(false)}>Reject</Button>
            <Button onClick={handleApproveChange}>Approve Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Details Dialog */}
      <Dialog open={taskDetailsDialogOpen} onOpenChange={setTaskDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Maintenance Task Details</DialogTitle>
            <DialogDescription>{selectedTask?.id}</DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Equipment</Label>
                  <p className="font-semibold">{selectedTask.equipment}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <Badge variant="secondary">{selectedTask.type}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Scheduled</Label>
                  <p className="font-semibold">{selectedTask.scheduled}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Priority</Label>
                  <Badge variant={selectedTask.priority === 'Critical' ? 'destructive' : 'default'}>
                    {selectedTask.priority}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Assignee</Label>
                  <p className="font-semibold">{selectedTask.assignee}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant="outline">{selectedTask.status}</Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-2">{selectedTask.description}</p>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Checklist</Label>
                <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                  <li>Safety lockout/tagout procedure</li>
                  <li>Equipment inspection</li>
                  <li>Replace worn components</li>
                  <li>Calibration and testing</li>
                  <li>Documentation and sign-off</li>
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setTaskDetailsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Task Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Maintenance</DialogTitle>
            <DialogDescription>{selectedTask?.equipment}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Date</Label>
              <Input
                type="date"
                value={rescheduleForm.date}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Assignee</Label>
              <Input
                value={rescheduleForm.assignee}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, assignee: e.target.value })}
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={rescheduleForm.priority} onValueChange={(value) => setRescheduleForm({ ...rescheduleForm, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
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

      {/* Equipment Details Dialog */}
      <Dialog open={equipmentDialogOpen} onOpenChange={setEquipmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Equipment Details</DialogTitle>
            <DialogDescription>{selectedEquipment?.name}</DialogDescription>
          </DialogHeader>
          {selectedEquipment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge
                    variant="outline"
                    className={
                      selectedEquipment.status === 'Operational'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : selectedEquipment.status === 'Needs Attention'
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }
                  >
                    {selectedEquipment.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Health Score</Label>
                  <p className="text-2xl font-bold">{selectedEquipment.health}%</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Hours Run</Label>
                  <p className="font-semibold">{selectedEquipment.hoursRun.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Service</Label>
                  <p className="font-semibold">{selectedEquipment.lastService}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Next Service</Label>
                  <p className="font-semibold">{selectedEquipment.nextService}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Health Overview</Label>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full ${
                        selectedEquipment.health >= 80 ? 'bg-green-600' : selectedEquipment.health >= 60 ? 'bg-orange-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${selectedEquipment.health}%` }}
                    />
                  </div>
                  <span className="font-semibold">{selectedEquipment.health}%</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Maintenance History</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between text-sm p-2 bg-muted rounded">
                    <span>Preventive Maintenance</span>
                    <span className="font-medium">{selectedEquipment.lastService}</span>
                  </div>
                  <div className="flex justify-between text-sm p-2 bg-muted rounded">
                    <span>Calibration Check</span>
                    <span className="font-medium">2024-09-20</span>
                  </div>
                  <div className="flex justify-between text-sm p-2 bg-muted rounded">
                    <span>Parts Replacement</span>
                    <span className="font-medium">2024-08-15</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setEquipmentDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Maintenance Task Dialog */}
      <Dialog open={newTaskDialogOpen} onOpenChange={setNewTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Maintenance Task</DialogTitle>
            <DialogDescription>Schedule a new maintenance task</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Equipment</Label>
              <Select value={newTaskForm.equipment} onValueChange={(value) => setNewTaskForm({ ...newTaskForm, equipment: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {equipment.map((eq, i) => (
                    <SelectItem key={i} value={eq.name}>{eq.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={newTaskForm.type} onValueChange={(value) => setNewTaskForm({ ...newTaskForm, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Preventive">Preventive</SelectItem>
                  <SelectItem value="Corrective">Corrective</SelectItem>
                  <SelectItem value="Predictive">Predictive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={newTaskForm.scheduled}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, scheduled: e.target.value })}
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={newTaskForm.priority} onValueChange={(value) => setNewTaskForm({ ...newTaskForm, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assignee</Label>
              <Input
                value={newTaskForm.assignee}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, assignee: e.target.value })}
                placeholder="Technician name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newTaskForm.description}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                placeholder="Describe the maintenance task"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitNewTask}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}