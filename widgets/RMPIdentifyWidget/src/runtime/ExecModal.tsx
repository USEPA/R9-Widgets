import {React, jsx} from 'jimu-core';
import {Modal, ModalBody, ModalFooter, ModalHeader} from 'jimu-ui';

export default function ExecModal(props) {
  return (
    <Modal style={{width: '80%', maxWidth: '80%', overflow: 'auto !important'}} isOpen={props.openModal}
           scrollable>
      <ModalHeader toggle={props.modalVis}>
        Executive Summary
      </ModalHeader>
      <ModalBody>
        {props.executiveSummaryText}
      </ModalBody>
      <ModalFooter></ModalFooter>
    </Modal>
  )
}
