import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-dark-900 border-t border-dark-700 py-16 px-6 md:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div>
            <h3 className="font-display text-2xl tracking-wider mb-6">栖光</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              专业视效制作 · 光影叙事艺术
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm tracking-widest uppercase mb-6">导航</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/works" className="text-gray-500 text-sm hover:text-white transition-colors">
                  作品集
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-500 text-sm hover:text-white transition-colors">
                  关于我们
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-500 text-sm hover:text-white transition-colors">
                  联系方式
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-sm tracking-widest uppercase mb-6">服务</h4>
            <ul className="space-y-3 text-gray-500 text-sm">
              <li>TVC广告</li>
              <li>产品动画</li>
              <li>发布会大屏</li>
              <li>影视剧</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm tracking-widest uppercase mb-6">联系</h4>
            <ul className="space-y-3 text-gray-500 text-sm">
              <li>电话：15091855505</li>
              <li>邮箱：184436962@qq.com</li>
              <li>地址：西安市</li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-dark-700 flex flex-col md:flex-row justify-between items-center text-gray-600 text-xs">
          <p>© 2024 西安栖光文化传播有限公司. All rights reserved.</p>
          <p className="mt-4 md:mt-0">alights.cn</p>
        </div>
      </div>
    </footer>
  )
}
