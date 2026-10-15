import { useRef } from 'react'
import { motion } from 'motion/react'
import { shop } from '../data.js'
import { useDialog } from '../hooks.js'

/**
 * Consent to personal data processing for the booking form, per Federal Law No. 152-FZ
 * «О персональных данных» (consent as the legal basis: art. 6 p. 1 part 1, art. 9).
 * The operator is named by the shop's public details only: the owner's legal entity
 * (name, ИНН/ОГРН) is not known yet and should be added to this text.
 */
export default function ConsentNotice({ onClose, onAgree }) {
  const closeRef = useRef(null)
  useDialog(true, onClose, closeRef)
  return (
    <div className="dialog-layer">
      <motion.div className="dialog-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.article
        className="notice"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        data-testid="consent-notice"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.18 } }}
        transition={{ type: 'spring', bounce: 0.12, visualDuration: 0.4 }}
      >
        <p className="mono notice-kicker">Федеральный закон № 152-ФЗ</p>
        <h3 id="consent-title" className="notice-title">
          Согласие на обработку персональных данных
        </h3>
        <p>
          Отправляя форму записи, вы свободно, своей волей и в своём интересе даёте согласие на обработку
          своих персональных данных в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О
          персональных данных».
        </p>
        <dl className="notice-list">
          <div>
            <dt>Оператор</dt>
            <dd>
              Магазин «{shop.name}», {shop.addressFull}, тел. {shop.phone}.
            </dd>
          </div>
          <div>
            <dt>Какие данные</dt>
            <dd>Имя и номер телефона, а также комментарий и состав корзины, если вы их добавили к записи.</dd>
          </div>
          <div>
            <dt>Зачем</dt>
            <dd>Чтобы связаться с вами, подтвердить запись на визит или выставку и перезвонить по вашей заявке.</dd>
          </div>
          <div>
            <dt>Что с ними делаем</dt>
            <dd>
              Сбор, запись, систематизацию, хранение, уточнение, использование, удаление и уничтожение — с
              использованием средств автоматизации и без них. Данные не передаются третьим лицам и не
              используются для рекламных рассылок.
            </dd>
          </div>
          <div>
            <dt>Срок</dt>
            <dd>Данные хранятся до достижения цели обработки или до отзыва согласия.</dd>
          </div>
          <div>
            <dt>Ваши права</dt>
            <dd>
              Вы можете узнать, какие ваши данные обрабатываются, потребовать их уточнения, блокирования или
              уничтожения (ст. 14 152-ФЗ). Согласие можно отозвать в любой момент — по телефону{' '}
              <a href={shop.phoneHref}>{shop.phone}</a> или письменно по адресу магазина (ч. 2 ст. 9). После
              отзыва обработка прекращается, а данные уничтожаются в срок до 30 дней.
            </dd>
          </div>
        </dl>
        <div className="notice-actions">
          <button type="button" className="btn btn-primary" onClick={onAgree}>
            Согласен
          </button>
          <button ref={closeRef} type="button" className="btn btn-ghost" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </motion.article>
    </div>
  )
}
