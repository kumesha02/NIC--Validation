import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  Bar
} from 'recharts';

const genderColors = ['#3b82f6', '#ec4899'];

const Charts = ({ genderDistribution = [], ageDistribution = [], recordsPerFile = [] }) => (
  <div className="grid gap-6 lg:grid-cols-2">
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800">Gender distribution</h3>
      <p className="text-sm text-gray-500">Breakdown of valid NIC records by gender.</p>
      <div className="h-64">
        <ResponsiveContainer>
          <PieChart>
            <RechartsTooltip />
            <Pie
              dataKey="value"
              data={genderDistribution}
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
            >
              {genderDistribution.map((entry, index) => (
                <Cell key={`cell-${entry.name}`} fill={genderColors[index % genderColors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>

    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800">Age distribution</h3>
      <p className="text-sm text-gray-500">Number of NIC records per age range.</p>
      <div className="h-64">
        <ResponsiveContainer>
          <BarChart data={ageDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis allowDecimals={false} />
            <RechartsTooltip />
            <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>

    <div className="rounded-lg bg-white p-6 shadow-sm lg:col-span-2">
      <h3 className="text-lg font-semibold text-gray-800">Records per file</h3>
      <p className="text-sm text-gray-500">Validation results grouped by uploaded files.</p>
      <div className="h-80">
        <ResponsiveContainer>
          <BarChart data={recordsPerFile}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fileName" />
            <YAxis allowDecimals={false} />
            <Legend />
            <RechartsTooltip />
            <Bar dataKey="total" fill="#1d4ed8" name="Total" />
            <Bar dataKey="valid" fill="#10b981" name="Valid" />
            <Bar dataKey="invalid" fill="#ef4444" name="Invalid" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

export default Charts;
