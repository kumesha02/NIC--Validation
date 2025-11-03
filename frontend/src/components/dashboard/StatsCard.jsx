const StatsCard = ({ label, value, icon: Icon, accent = 'bg-primary-100 text-primary-600' }) => (
  <div className="rounded-lg bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      </div>
      {Icon && (
        <span className={`rounded-full p-3 ${accent}`}>
          <Icon className="h-5 w-5" />
        </span>
      )}
    </div>
  </div>
);

export default StatsCard;
