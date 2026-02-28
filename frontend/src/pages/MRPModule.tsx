import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, TrendingUp, AlertCircle, CheckCircle, DollarSign, ShoppingCart, Truck, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  product: string;
  quantity: number;
  status: string;
  priority: string;
  materials: number;
  cost: number;
  delivery: string;
  capacity: string;
}

interface Material {
  name: string;
  stock: number;
  required: number;
  status: string;
  lead: string;
  supplier: string;
  unitCost: number;
}

interface ReplenishmentItem {
  id: number;
  material: string;
  quantity: number;
  method: string;
  supplier: string;
  cost: number;
  eta: string;
  status: string;
}

export default function MRPModule() {
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 'MO-2024-001',
      product: 'Vacuum Bags - 200μm',
      quantity: 10000,
      status: 'In Production',
      priority: 'High',
      materials: 95,
      cost: 12500,
      delivery: '2024-11-15',
      capacity: 'Available',
    },
    {
      id: 'MO-2024-002',
      product: 'Center Seal Bags',
      quantity: 8000,
      status: 'Planning',
      priority: 'Medium',
      materials: 100,
      cost: 9800,
      delivery: '2024-11-18',
      capacity: 'Available',
    },
    {
      id: 'MO-2024-003',
      product: 'Zipper Stand-up Pouches',
      quantity: 5000,
      status: 'Material Shortage',
      priority: 'High',
      materials: 65,
      cost: 15200,
      delivery: '2024-11-20',
      capacity: 'Limited',
    },
    {
      id: 'MO-2024-004',
      product: 'Thermoforming Films',
      quantity: 12000,
      status: 'Scheduled',
      priority: 'Low',
      materials: 100,
      cost: 18900,
      delivery: '2024-11-25',
      capacity: 'Available',
    },
  ]);

  const [materials, setMaterials] = useState<Material[]>([
    { name: 'PE Film Roll', stock: 2500, required: 3200, status: 'shortage', lead: '3 days', supplier: 'Supplier A', unitCost: 4.5 },
    { name: 'PP Film Roll', stock: 4800, required: 3000, status: 'sufficient', lead: '2 days', supplier: 'Supplier B', unitCost: 3.8 },
    { name: 'EVOH Barrier Layer', stock: 1200, required: 1500, status: 'low', lead: '5 days', supplier: 'Supplier C', unitCost: 8.2 },
    { name: 'Printing Ink - Blue', stock: 850, required: 600, status: 'sufficient', lead: '1 day', supplier: 'Supplier D', unitCost: 12.5 },
    { name: 'Zipper Components', stock: 3500, required: 5000, status: 'shortage', lead: '4 days', supplier: 'Supplier E', unitCost: 2.3 },
    { name: 'Adhesive Resin', stock: 920, required: 800, status: 'sufficient', lead: '2 days', supplier: 'Supplier A', unitCost: 6.8 },
  ]);

  const [replenishment, setReplenishment] = useState<ReplenishmentItem[]>([
    { id: 1, material: 'PE Film Roll', quantity: 1000, method: 'Purchase', supplier: 'Supplier A', cost: 4500, eta: '3 days', status: 'pending' },
    { id: 2, material: 'Zipper Components', quantity: 2000, method: 'Purchase', supplier: 'Supplier E', cost: 3200, eta: '4 days', status: 'pending' },
    { id: 3, material: 'EVOH Barrier Layer', quantity: 500, method: 'Transfer', supplier: 'Warehouse B', cost: 0, eta: '1 day', status: 'pending' },
  ]);

  // Dialog states
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedReplenishment, setSelectedReplenishment] = useState<ReplenishmentItem | null>(null);

  // Form states for purchase
  const [purchaseForm, setPurchaseForm] = useState({
    material: '',
    supplier: '',
    quantity: '',
    urgency: 'normal',
    notes: '',
  });

  // Form states for modify
  const [modifyForm, setModifyForm] = useState({
    quantity: '',
    method: '',
    supplier: '',
    eta: '',
  });

  const handleViewOrderReport = (order: Order) => {
    setSelectedOrder(order);
    setReportDialogOpen(true);
  };

  const handleExportReport = () => {
    toast.success('Report exported', {
      description: 'Manufacturing order report has been downloaded as PDF',
    });
  };

  const handleOrderNow = (material: Material) => {
    setSelectedMaterial(material);
    setPurchaseForm({
      material: material.name,
      supplier: material.supplier,
      quantity: String(material.required - material.stock),
      urgency: 'normal',
      notes: '',
    });
    setPurchaseDialogOpen(true);
  };

  const handleSubmitPurchase = () => {
    if (!purchaseForm.quantity || parseInt(purchaseForm.quantity) <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const cost = selectedMaterial ? selectedMaterial.unitCost * parseInt(purchaseForm.quantity) : 0;
    
    toast.success('Purchase order created', {
      description: `PO for ${purchaseForm.material} - ${purchaseForm.quantity} kg - $${cost.toFixed(2)}`,
    });

    setMaterials(materials.map(m => 
      m.name === purchaseForm.material ? { ...m, status: 'sufficient' } : m
    ));

    setPurchaseDialogOpen(false);
    setPurchaseForm({ material: '', supplier: '', quantity: '', urgency: 'normal', notes: '' });
  };

  const handleModify = (item: ReplenishmentItem) => {
    setSelectedReplenishment(item);
    setModifyForm({
      quantity: String(item.quantity),
      method: item.method,
      supplier: item.supplier,
      eta: item.eta,
    });
    setModifyDialogOpen(true);
  };

  const handleSubmitModify = () => {
    if (!modifyForm.quantity || parseInt(modifyForm.quantity) <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (!selectedReplenishment) return;

    setReplenishment(replenishment.map(r => 
      r.id === selectedReplenishment.id 
        ? { 
            ...r, 
            quantity: parseInt(modifyForm.quantity),
            method: modifyForm.method,
            supplier: modifyForm.supplier,
            eta: modifyForm.eta,
          } 
        : r
    ));

    toast.success('Replenishment modified', {
      description: 'Order has been updated successfully',
    });

    setModifyDialogOpen(false);
  };

  const handleApprove = (id: number) => {
    setReplenishment(replenishment.map(r => 
      r.id === id ? { ...r, status: 'approved' } : r
    ));
    toast.success('Replenishment approved', {
      description: 'Order has been approved and will be processed',
    });
  };

  const handleReject = (id: number) => {
    setReplenishment(replenishment.filter(r => r.id !== id));
    toast.error('Replenishment rejected', {
      description: 'Order has been rejected',
    });
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">+5 from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Capacity Utilization</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87.3%</div>
            <p className="text-xs text-muted-foreground">Optimal range</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Material Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cost Control</CardTitle>
            <DollarSign className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1.2M</div>
            <p className="text-xs text-green-600">-8.3% vs budget</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">Manufacturing Orders</TabsTrigger>
          <TabsTrigger value="materials">Material Availability</TabsTrigger>
          <TabsTrigger value="replenishment">Replenishment Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manufacturing Orders - Real-time Planning</CardTitle>
              <CardDescription>Simulated orders with capacity and material analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Materials</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.product}</TableCell>
                      <TableCell>{order.quantity.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            order.status === 'In Production'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : order.status === 'Material Shortage'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.priority === 'High' ? 'destructive' : 'secondary'}>{order.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                order.materials >= 90 ? 'bg-green-600' : order.materials >= 70 ? 'bg-orange-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${order.materials}%` }}
                            />
                          </div>
                          <span className="text-xs">{order.materials}%</span>
                        </div>
                      </TableCell>
                      <TableCell>${order.cost.toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{order.delivery}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => handleViewOrderReport(order)}>
                          <FileText className="h-3 w-3 mr-1" />
                          Report
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Component Availability Tracking</CardTitle>
              <CardDescription>Real-time inventory vs requirements</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{material.name}</TableCell>
                      <TableCell>{material.stock.toLocaleString()} kg</TableCell>
                      <TableCell>{material.required.toLocaleString()} kg</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            material.status === 'sufficient'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : material.status === 'low'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }
                        >
                          {material.status === 'sufficient'
                            ? 'Sufficient'
                            : material.status === 'low'
                            ? 'Low Stock'
                            : 'Shortage'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{material.lead}</TableCell>
                      <TableCell className="text-xs">{material.supplier}</TableCell>
                      <TableCell>
                        {material.status !== 'sufficient' && (
                          <Button size="sm" variant="outline" onClick={() => handleOrderNow(material)}>
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Order
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="replenishment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Just-in-Time Replenishment Propositions</CardTitle>
              <CardDescription>Make or buy decisions with cost analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {replenishment.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {item.method === 'Purchase' ? (
                          <ShoppingCart className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Truck className="h-5 w-5 text-green-600" />
                        )}
                        <div>
                          <h4 className="font-semibold">{item.material}</h4>
                          <p className="text-sm text-muted-foreground">Quantity: {item.quantity.toLocaleString()} kg</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={item.method === 'Purchase' ? 'default' : 'secondary'}>{item.method}</Badge>
                        {item.status === 'approved' && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Source</p>
                        <p className="font-medium">{item.supplier}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cost</p>
                        <p className="font-medium">${item.cost.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">ETA</p>
                        <p className="font-medium">{item.eta}</p>
                      </div>
                    </div>
                    {item.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => handleApprove(item.id)}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleModify(item)}>
                          Modify
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleReject(item.id)}>
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manufacturing Order Report</DialogTitle>
            <DialogDescription>Detailed analysis for {selectedOrder?.id}</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Order ID</Label>
                  <p className="font-semibold">{selectedOrder.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Product</Label>
                  <p className="font-semibold">{selectedOrder.product}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Quantity</Label>
                  <p className="font-semibold">{selectedOrder.quantity.toLocaleString()} units</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant="outline">{selectedOrder.status}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Priority</Label>
                  <Badge variant={selectedOrder.priority === 'High' ? 'destructive' : 'secondary'}>
                    {selectedOrder.priority}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Delivery Date</Label>
                  <p className="font-semibold">{selectedOrder.delivery}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Cost</Label>
                  <p className="font-semibold text-lg">${selectedOrder.cost.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Material Availability</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-green-600 h-3 rounded-full"
                        style={{ width: `${selectedOrder.materials}%` }}
                      />
                    </div>
                    <span className="font-semibold">{selectedOrder.materials}%</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Production Timeline</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Order Created</span>
                    <span className="font-medium">2024-11-10</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Production Start</span>
                    <span className="font-medium">2024-11-12</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Expected Completion</span>
                    <span className="font-medium">{selectedOrder.delivery}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Cost Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Raw Materials</span>
                    <span className="font-medium">${(selectedOrder.cost * 0.6).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Labor</span>
                    <span className="font-medium">${(selectedOrder.cost * 0.25).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Overhead</span>
                    <span className="font-medium">${(selectedOrder.cost * 0.15).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total</span>
                    <span>${selectedOrder.cost.toLocaleString()}</span>
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

      {/* Purchase Order Dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>Order materials from supplier</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Material</Label>
              <Input value={purchaseForm.material} disabled />
            </div>
            <div>
              <Label>Supplier</Label>
              <Select value={purchaseForm.supplier} onValueChange={(value) => setPurchaseForm({...purchaseForm, supplier: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Supplier A">Supplier A</SelectItem>
                  <SelectItem value="Supplier B">Supplier B</SelectItem>
                  <SelectItem value="Supplier C">Supplier C</SelectItem>
                  <SelectItem value="Supplier D">Supplier D</SelectItem>
                  <SelectItem value="Supplier E">Supplier E</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity (kg)</Label>
              <Input 
                type="number" 
                value={purchaseForm.quantity}
                onChange={(e) => setPurchaseForm({...purchaseForm, quantity: e.target.value})}
                placeholder="Enter quantity"
              />
            </div>
            <div>
              <Label>Urgency</Label>
              <Select value={purchaseForm.urgency} onValueChange={(value) => setPurchaseForm({...purchaseForm, urgency: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input 
                value={purchaseForm.notes}
                onChange={(e) => setPurchaseForm({...purchaseForm, notes: e.target.value})}
                placeholder="Additional notes (optional)"
              />
            </div>
            {selectedMaterial && purchaseForm.quantity && (
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Estimated Cost:</span>
                  <span className="text-xl font-bold">
                    ${(selectedMaterial.unitCost * parseInt(purchaseForm.quantity || '0')).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitPurchase}>Create Purchase Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modify Replenishment Dialog */}
      <Dialog open={modifyDialogOpen} onOpenChange={setModifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify Replenishment Order</DialogTitle>
            <DialogDescription>Update order details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Material</Label>
              <Input value={selectedReplenishment?.material || ''} disabled />
            </div>
            <div>
              <Label>Quantity (kg)</Label>
              <Input 
                type="number" 
                value={modifyForm.quantity}
                onChange={(e) => setModifyForm({...modifyForm, quantity: e.target.value})}
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select value={modifyForm.method} onValueChange={(value) => setModifyForm({...modifyForm, method: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Purchase">Purchase</SelectItem>
                  <SelectItem value="Transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Supplier/Source</Label>
              <Input 
                value={modifyForm.supplier}
                onChange={(e) => setModifyForm({...modifyForm, supplier: e.target.value})}
              />
            </div>
            <div>
              <Label>ETA</Label>
              <Input 
                value={modifyForm.eta}
                onChange={(e) => setModifyForm({...modifyForm, eta: e.target.value})}
                placeholder="e.g., 3 days"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModifyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitModify}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}