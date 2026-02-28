import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Scan, ClipboardCheck, MessageSquare, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function ShopFloorModule() {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [unitsInput, setUnitsInput] = useState('');
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const workcenters = [
    { id: 'WC-01', name: 'Extrusion Line 1', status: 'Active', workers: 3, efficiency: 94, output: 7800 },
    { id: 'WC-02', name: 'Extrusion Line 2', status: 'Active', workers: 3, efficiency: 87, output: 6500 },
    { id: 'WC-03', name: 'Printing Station 1', status: 'Active', workers: 2, efficiency: 92, output: 4500 },
    { id: 'WC-04', name: 'Laminating Station', status: 'Maintenance', workers: 0, efficiency: 0, output: 0 },
    { id: 'WC-05', name: 'Slitting Line 1', status: 'Active', workers: 2, efficiency: 96, output: 8200 },
    { id: 'WC-06', name: 'Quality Control', status: 'Active', workers: 4, efficiency: 98, output: 0 },
  ];

  const workers = [
    { id: 'W-001', name: 'John Smith', station: 'Extrusion Line 1', shift: 'Day', status: 'Working', hours: 6.5 },
    { id: 'W-002', name: 'Sarah Johnson', station: 'Printing Station 1', shift: 'Day', status: 'Working', hours: 5.2 },
    { id: 'W-003', name: 'Mike Wilson', station: 'Extrusion Line 2', shift: 'Day', status: 'Break', hours: 4.8 },
    { id: 'W-004', name: 'Emily Davis', station: 'Quality Control', shift: 'Day', status: 'Working', hours: 7.1 },
    { id: 'W-005', name: 'Robert Brown', station: 'Slitting Line 1', shift: 'Day', status: 'Working', hours: 6.3 },
    { id: 'W-006', name: 'Lisa Anderson', station: 'Quality Control', shift: 'Day', status: 'Working', hours: 5.9 },
  ];

  const [feedback, setFeedback] = useState([
    {
      id: 'FB-001',
      worker: 'John Smith',
      type: 'Waste Reduction',
      message: 'Film trimming waste can be reduced by adjusting blade alignment',
      time: '15 min ago',
      status: 'New',
    },
    {
      id: 'FB-002',
      worker: 'Sarah Johnson',
      type: 'Process Improvement',
      message: 'Ink drying time could be optimized with temperature adjustment',
      time: '1 hour ago',
      status: 'Under Review',
    },
    {
      id: 'FB-003',
      worker: 'Emily Davis',
      type: 'Quality Issue',
      message: 'Noticed slight color variation in batch #2341',
      time: '2 hours ago',
      status: 'Resolved',
    },
  ]);

  const [productionRecords, setProductionRecords] = useState([
    { batch: 'B-2024-145', product: 'Vacuum Bags', quantity: 7800, scanned: '10:45 AM', operator: 'John Smith' },
    { batch: 'B-2024-146', product: 'Center Seal', quantity: 4500, scanned: '11:20 AM', operator: 'Sarah Johnson' },
    { batch: 'B-2024-147', product: 'Zipper Pouches', quantity: 3200, scanned: '12:15 PM', operator: 'Mike Wilson' },
  ]);

  const handleRecordProduction = () => {
    if (!barcodeInput) {
      toast.error('Please enter a batch number');
      return;
    }
    
    if (!unitsInput || parseInt(unitsInput) <= 0) {
      toast.error('Please enter a valid quantity of units');
      return;
    }
    
    const newRecord = {
      batch: barcodeInput,
      product: 'New Product',
      quantity: parseInt(unitsInput),
      scanned: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      operator: 'Current User',
    };
    
    setProductionRecords([newRecord, ...productionRecords]);
    setBarcodeInput('');
    setUnitsInput('');
    
    toast.success('Production recorded successfully', {
      description: `Batch ${newRecord.batch} - ${newRecord.quantity.toLocaleString()} units`,
    });
  };

  const handleSubmitFeedback = () => {
    if (!feedbackName || !feedbackCategory || !feedbackMessage) {
      toast.error('Please fill in all fields');
      return;
    }
    
    const newFeedback = {
      id: `FB-${String(feedback.length + 1).padStart(3, '0')}`,
      worker: feedbackName,
      type: feedbackCategory,
      message: feedbackMessage,
      time: 'Just now',
      status: 'New',
    };
    
    setFeedback([newFeedback, ...feedback]);
    setFeedbackName('');
    setFeedbackCategory('');
    setFeedbackMessage('');
    
    toast.success('Feedback submitted successfully', {
      description: 'Your feedback has been recorded',
    });
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground">Day shift</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Workcenters Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5 / 6</div>
            <p className="text-xs text-muted-foreground">1 in maintenance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Output</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">27,000</div>
            <p className="text-xs text-muted-foreground">Units produced</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Feedback Items</CardTitle>
            <MessageSquare className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedback.length}</div>
            <p className="text-xs text-muted-foreground">{feedback.filter(f => f.status === 'New').length} pending review</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="workcenters" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workcenters">Workcenters</TabsTrigger>
          <TabsTrigger value="workers">Workers</TabsTrigger>
          <TabsTrigger value="recording">Production Recording</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="workcenters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workcenter Dashboard</CardTitle>
              <CardDescription>Real-time status of all manufacturing stations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workcenters.map((center) => (
                  <Card key={center.id} className="border-2 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
                    toast.info(`${center.name} Details`, {
                      description: `Status: ${center.status} | Workers: ${center.workers} | Efficiency: ${center.efficiency}%`,
                    });
                  }}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{center.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{center.id}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            center.status === 'Active'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-orange-50 text-orange-700 border-orange-200'
                          }
                        >
                          {center.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Workers</p>
                          <p className="font-bold text-lg">{center.workers}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Efficiency</p>
                          <p className="font-bold text-lg">{center.efficiency}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Output</p>
                          <p className="font-bold text-lg">{center.output}</p>
                        </div>
                      </div>
                      {center.status === 'Active' && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${center.efficiency}%` }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Worker Management</CardTitle>
              <CardDescription>Track worker assignments and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workers.map((worker) => (
                  <div key={worker.id} className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => {
                    toast.info(`${worker.name} Details`, {
                      description: `Station: ${worker.station} | Status: ${worker.status} | Hours: ${worker.hours}h`,
                    });
                  }}>
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {worker.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div>
                        <p className="font-semibold">{worker.name}</p>
                        <p className="text-sm text-muted-foreground">{worker.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Station</p>
                        <p className="font-medium">{worker.station}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Shift</p>
                        <p className="font-medium">{worker.shift}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Hours</p>
                        <p className="font-medium">{worker.hours}h</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          worker.status === 'Working'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-orange-50 text-orange-700 border-orange-200'
                        }
                      >
                        {worker.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recording" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Production Recording - Barcode Scanning</CardTitle>
              <CardDescription>Tablet-optimized interface for production tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Barcode Scanner Simulation */}
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 bg-blue-50">
                <div className="flex flex-col items-center gap-4">
                  <Scan className="h-16 w-16 text-blue-600" />
                  <h3 className="text-lg font-semibold">Record Production</h3>
                  
                  <div className="w-full max-w-md space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Batch Number</label>
                      <Input
                        placeholder="Enter or scan batch number (e.g., B-2024-149)"
                        className="text-center text-lg"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Units Produced</label>
                      <Input
                        type="number"
                        placeholder="Enter quantity (e.g., 5000)"
                        className="text-center text-lg"
                        value={unitsInput}
                        onChange={(e) => setUnitsInput(e.target.value)}
                        min="1"
                      />
                    </div>
                  </div>
                  
                  <Button size="lg" className="w-full max-w-md" onClick={handleRecordProduction}>
                    <ClipboardCheck className="h-5 w-5 mr-2" />
                    Record Production
                  </Button>
                </div>
              </div>

              {/* Recent Records */}
              <div>
                <h4 className="font-semibold mb-3">Recent Production Records</h4>
                <div className="space-y-2">
                  {productionRecords.map((record, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/70" onClick={() => {
                      toast.info(`Batch ${record.batch}`, {
                        description: `${record.product} - ${record.quantity.toLocaleString()} units by ${record.operator}`,
                      });
                    }}>
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">{record.batch}</p>
                          <p className="text-sm text-muted-foreground">{record.product}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{record.quantity.toLocaleString()} units</p>
                        <p className="text-xs text-muted-foreground">
                          {record.scanned} by {record.operator}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Worker Feedback System</CardTitle>
              <CardDescription>Continuous improvement through shop floor insights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Submit Feedback Form */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-semibold mb-3">Submit New Feedback</h4>
                <div className="space-y-3">
                  <Input 
                    placeholder="Your name" 
                    value={feedbackName}
                    onChange={(e) => setFeedbackName(e.target.value)}
                  />
                  <Input 
                    placeholder="Feedback category (Waste, Quality, Process, Safety)" 
                    value={feedbackCategory}
                    onChange={(e) => setFeedbackCategory(e.target.value)}
                  />
                  <Textarea 
                    placeholder="Describe your observation or suggestion..." 
                    rows={3}
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                  />
                  <Button className="w-full" onClick={handleSubmitFeedback}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Submit Feedback
                  </Button>
                </div>
              </div>

              {/* Feedback List */}
              <div>
                <h4 className="font-semibold mb-3">Recent Feedback</h4>
                <div className="space-y-3">
                  {feedback.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => {
                      toast.info(`Feedback from ${item.worker}`, {
                        description: item.message,
                      });
                    }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.type}</Badge>
                          <span className="text-sm font-medium">{item.worker}</span>
                        </div>
                        <Badge
                          variant={
                            item.status === 'New'
                              ? 'default'
                              : item.status === 'Under Review'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-sm">{item.message}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.time}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}